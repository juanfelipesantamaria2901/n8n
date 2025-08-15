import type { LicenseProvider } from '@n8n/backend-common';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	LICENSE_FEATURES,
	LICENSE_QUOTAS,
	Time,
	UNLIMITED_LICENSE_QUOTA,
	type BooleanLicenseFeature,
	type NumericLicenseFeature,
} from '@n8n/constants';
import { SettingsRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { TEntitlement, TLicenseBlock } from '@n8n_io/license-sdk';
import { LicenseManager } from '@n8n_io/license-sdk';
import { InstanceSettings } from 'n8n-core';

import config from '@/config';
import { LicenseMetricsService } from '@/metrics/license-metrics.service';

import { N8N_VERSION, SETTINGS_LICENSE_CERT_KEY } from './constants';

const LICENSE_RENEWAL_DISABLED_WARNING =
	'Automatic license renewal is disabled. The license will not renew automatically, and access to licensed features may be lost!';

export type FeatureReturnType = Partial<
	{
		planName: string;
	} & { [K in NumericLicenseFeature]: number } & { [K in BooleanLicenseFeature]: boolean }
>;

@Service()
export class License implements LicenseProvider {
	private manager: LicenseManager | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly settingsRepository: SettingsRepository,
		private readonly licenseMetricsService: LicenseMetricsService,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('license');
	}

	async init({
		forceRecreate = false,
		isCli = false,
	}: { forceRecreate?: boolean; isCli?: boolean } = {}) {
		if (this.manager && !forceRecreate) {
			this.logger.warn('License manager already initialized or shutting down');
			return;
		}
		if (this.isShuttingDown) {
			this.logger.warn('License manager already shutting down');
			return;
		}

		const { instanceType } = this.instanceSettings;
		const isMainInstance = instanceType === 'main';
		const server = this.globalConfig.license.serverUrl;
		const offlineMode = true; // Force offline mode for production with community license
		const autoRenewOffset = 72 * Time.hours.toSeconds;
		const saveCertStr = isMainInstance
			? async (value: TLicenseBlock) => await this.saveCertStr(value)
			: async () => {};
		const onFeatureChange = isMainInstance
			? async () => await this.onFeatureChange()
			: async () => {};
		const onLicenseRenewed = isMainInstance
			? async () => await this.onLicenseRenewed()
			: async () => {};
		const collectUsageMetrics = isMainInstance
			? async () => await this.licenseMetricsService.collectUsageMetrics()
			: async () => [];
		const collectPassthroughData = isMainInstance
			? async () => await this.licenseMetricsService.collectPassthroughData()
			: async () => ({});
		const onExpirySoon = !this.instanceSettings.isLeader ? () => this.onExpirySoon() : undefined;
		const expirySoonOffsetMins = !this.instanceSettings.isLeader ? 120 : undefined;

		const { isLeader } = this.instanceSettings;
		const { autoRenewalEnabled } = this.globalConfig.license;
		const eligibleToRenew = isCli || isLeader;

		const shouldRenew = false; // Disable auto-renewal for community license in production

		if (eligibleToRenew && !autoRenewalEnabled) {
			this.logger.warn(LICENSE_RENEWAL_DISABLED_WARNING);
		}

		try {
			this.manager = new LicenseManager({
				server,
				tenantId: this.globalConfig.license.tenantId,
				productIdentifier: `n8n-${N8N_VERSION}`,
				autoRenewEnabled: shouldRenew,
				renewOnInit: shouldRenew,
				autoRenewOffset,
				detachFloatingOnShutdown: this.globalConfig.license.detachFloatingOnShutdown,
				offlineMode,
				logger: this.logger,
				loadCertStr: async () => await this.loadCertStr(),
				saveCertStr,
				deviceFingerprint: () => this.instanceSettings.instanceId,
				collectUsageMetrics,
				collectPassthroughData,
				onFeatureChange,
				onLicenseRenewed,
				onExpirySoon,
				expirySoonOffsetMins,
			});

			await this.manager.initialize();

			this.logger.debug('License initialized');
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.logger.error('Could not initialize license manager sdk', { error });
			}
		}
	}

	async loadCertStr(): Promise<TLicenseBlock> {
		// if we have an ephemeral license, we don't want to load it from the database
		const ephemeralLicense = this.globalConfig.license.cert;
		if (ephemeralLicense) {
			return ephemeralLicense;
		}
		const databaseSettings = await this.settingsRepository.findOne({
			where: {
				key: SETTINGS_LICENSE_CERT_KEY,
			},
		});

		return databaseSettings?.value ?? '';
	}

	private async onFeatureChange() {
		void this.broadcastReloadLicenseCommand();
	}

	private async onLicenseRenewed() {
		void this.broadcastReloadLicenseCommand();
	}

	private async broadcastReloadLicenseCommand() {
		if (config.getEnv('executions.mode') === 'queue' && this.instanceSettings.isLeader) {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			await Container.get(Publisher).publishCommand({ command: 'reload-license' });
		}
	}

	async saveCertStr(value: TLicenseBlock): Promise<void> {
		// if we have an ephemeral license, we don't want to save it to the database
		if (this.globalConfig.license.cert) return;
		await this.settingsRepository.upsert(
			{
				key: SETTINGS_LICENSE_CERT_KEY,
				value,
				loadOnStartup: false,
			},
			['key'],
		);
	}

	async activate(activationKey: string): Promise<void> {
		if (!this.manager) {
			return;
		}

		await this.manager.activate(activationKey);
		this.logger.debug('License activated');
	}

	@OnPubSubEvent('reload-license')
	async reload(): Promise<void> {
		if (!this.manager) {
			return;
		}
		await this.manager.reload();
		this.logger.debug('License reloaded');
	}

	async renew() {
		if (!this.manager) {
			return;
		}

		await this.manager.renew();
		this.logger.debug('License renewed');
	}

	async clear() {
		if (!this.manager) {
			return;
		}

		await this.manager.clear();
		this.logger.info('License cleared');
	}

	@OnShutdown()
	async shutdown() {
		// Shut down License manager to unclaim any floating entitlements
		// Note: While this saves a new license cert to DB, the previous entitlements are still kept in memory so that the shutdown process can complete
		this.isShuttingDown = true;

		if (!this.manager) {
			return;
		}

		await this.manager.shutdown();
		this.logger.debug('License shut down');
	}

	isLicensed(feature: BooleanLicenseFeature) {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isSharingLicensed` instead. */
	isSharingEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isLogStreamingLicensed` instead. */
	isLogStreamingEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isLdapLicensed` instead. */
	isLdapEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isSamlLicensed` instead. */
	isSamlEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isApiKeyScopesLicensed` instead. */
	isApiKeyScopesEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isAiAssistantLicensed` instead. */
	isAiAssistantEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isAskAiLicensed` instead. */
	isAskAiEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isAiCreditsLicensed` instead. */
	isAiCreditsEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isAdvancedExecutionFiltersLicensed` instead. */
	isAdvancedExecutionFiltersEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isAdvancedPermissionsLicensed` instead. */
	isAdvancedPermissionsLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isDebugInEditorLicensed` instead. */
	isDebugInEditorLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isBinaryDataS3Licensed` instead. */
	isBinaryDataS3Licensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isMultiMainLicensed` instead. */
	isMultiMainLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isVariablesLicensed` instead. */
	isVariablesEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isSourceControlLicensed` instead. */
	isSourceControlLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isExternalSecretsLicensed` instead. */
	isExternalSecretsEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isWorkflowHistoryLicensed` instead. */
	isWorkflowHistoryLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isAPIDisabled` instead. */
	isAPIDisabled() {
		return false; // API should not be disabled
	}

	/** @deprecated Use `LicenseState.isWorkerViewLicensed` instead. */
	isWorkerViewLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isProjectRoleAdminLicensed` instead. */
	isProjectRoleAdminLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isProjectRoleEditorLicensed` instead. */
	isProjectRoleEditorLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isProjectRoleViewerLicensed` instead. */
	isProjectRoleViewerLicensed() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isCustomNpmRegistryLicensed` instead. */
	isCustomNpmRegistryEnabled() {
		return true; // All features enabled for all users
	}

	/** @deprecated Use `LicenseState.isFoldersLicensed` instead. */
	isFoldersEnabled() {
		return true; // All features enabled for all users
	}

	getCurrentEntitlements() {
		return this.manager?.getCurrentEntitlements() ?? [];
	}

	getValue<T extends keyof FeatureReturnType>(feature: T): FeatureReturnType[T] {
		// Return unlimited/max values for all features
		if (feature === 'planName') return 'Enterprise' as FeatureReturnType[T];
		return UNLIMITED_LICENSE_QUOTA as FeatureReturnType[T];
	}

	getManagementJwt(): string {
		if (!this.manager) {
			return '';
		}
		return this.manager.getManagementJwt();
	}

	/**
	 * Helper function to get the latest main plan for a license
	 */
	getMainPlan(): TEntitlement | undefined {
		if (!this.manager) {
			return undefined;
		}

		const entitlements = this.getCurrentEntitlements();
		if (!entitlements.length) {
			return undefined;
		}

		entitlements.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());

		return entitlements.find(
			(entitlement) => (entitlement.productMetadata?.terms as { isMainPlan?: boolean })?.isMainPlan,
		);
	}

	getConsumerId() {
		return this.manager?.getConsumerId() ?? 'unknown';
	}

	// Helper functions for computed data

	/** @deprecated Use `LicenseState` instead. */
	getUsersLimit() {
		return UNLIMITED_LICENSE_QUOTA; // Unlimited users
	}

	/** @deprecated Use `LicenseState` instead. */
	getTriggerLimit() {
		return UNLIMITED_LICENSE_QUOTA; // Unlimited triggers
	}

	/** @deprecated Use `LicenseState` instead. */
	getVariablesLimit() {
		return UNLIMITED_LICENSE_QUOTA; // Unlimited variables
	}

	/** @deprecated Use `LicenseState` instead. */
	getAiCredits() {
		return UNLIMITED_LICENSE_QUOTA; // Unlimited AI credits
	}

	/** @deprecated Use `LicenseState` instead. */
	getWorkflowHistoryPruneLimit() {
		return UNLIMITED_LICENSE_QUOTA; // Unlimited workflow history
	}

	/** @deprecated Use `LicenseState` instead. */
	getTeamProjectLimit() {
		return UNLIMITED_LICENSE_QUOTA; // Unlimited team projects
	}

	getPlanName(): string {
		return 'Enterprise'; // All users have enterprise access
	}

	getInfo(): string {
		if (!this.manager) {
			return 'n/a';
		}

		return this.manager.toString();
	}

	/** @deprecated Use `LicenseState` instead. */
	isWithinUsersLimit() {
		return true; // Always within limits
	}

	@OnLeaderTakeover()
	enableAutoRenewals() {
		this.manager?.enableAutoRenewals();
	}

	@OnLeaderStepdown()
	disableAutoRenewals() {
		this.manager?.disableAutoRenewals();
	}

	private onExpirySoon() {
		this.logger.info('License is about to expire soon, reloading license...');

		// reload in background to avoid blocking SDK

		void this.reload()
			.then(() => {
				this.logger.info('Reloaded license on expiry soon');
			})
			.catch((error) => {
				this.logger.error('Failed to reload license on expiry soon', {
					error: error instanceof Error ? error.message : error,
				});
			});
	}
}
