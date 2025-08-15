import { createPinia, setActivePinia } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';

let uiStore: ReturnType<typeof useUIStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

describe('UI store', () => {
	let mockedCloudStore;

	beforeEach(() => {
		setActivePinia(createPinia());
		uiStore = useUIStore();

		cloudPlanStore = useCloudPlanStore();

		mockedCloudStore = vi.spyOn(cloudPlanStore, 'getAutoLoginCode');
		mockedCloudStore.mockImplementationOnce(async () => ({
			code: '123',
		}));

		global.window = Object.create(window);

		const url = 'https://test.app.n8n.cloud';

		Object.defineProperty(window, 'location', {
			value: {
				href: url,
			},
			writable: true,
		});
	});

	it('should not add non-production license banner to stack for enterprise bypass fork', () => {
		uiStore.initialize({
			banners: [],
		});
		expect(uiStore.bannerStack).not.toContain('NON_PRODUCTION_LICENSE');
	});

	it("should add V1 banner to stack if it's not dismissed", () => {
		uiStore.initialize({
			banners: ['V1'],
		});
		expect(uiStore.bannerStack).toContain('V1');
	});

	it("should not add V1 banner to stack if it's dismissed", () => {
		uiStore.initialize({
			banners: [],
		});

		expect(uiStore.bannerStack).not.toContain('V1');
	});
});
