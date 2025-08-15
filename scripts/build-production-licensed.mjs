#!/usr/bin/env zx

import { $ } from 'zx';

const VERSION = process.env.VERSION || 'latest';
const IMAGE_NAME = 'digitalwavesystems/n8n';
const TAG = `${VERSION}-production-licensed`;

console.log('🔨 Building n8n Production Licensed Docker image...');

// Build the application first
console.log('📦 Building n8n application...');
await $`pnpm build:n8n`;

// Build the Docker image
console.log(`🐳 Building Docker image: ${IMAGE_NAME}:${TAG}`);
await $`docker build -f docker/images/n8n/Dockerfile.production-licensed -t ${IMAGE_NAME}:${TAG} .`;

// Tag as latest production licensed
await $`docker tag ${IMAGE_NAME}:${TAG} ${IMAGE_NAME}:production-licensed`;

console.log('✅ Build completed successfully!');
console.log(`🚀 To run: docker run -p 5678:5678 ${IMAGE_NAME}:${TAG}`);
console.log(`📤 To push: docker push ${IMAGE_NAME}:${TAG}`);

// Optional: Push to Docker Hub
if (process.env.PUSH === 'true') {
  console.log('🚀 Pushing to Docker Hub...');
  await $`docker push ${IMAGE_NAME}:${TAG}`;
  await $`docker push ${IMAGE_NAME}:production-licensed`;
  console.log('✅ Push completed!');
}
