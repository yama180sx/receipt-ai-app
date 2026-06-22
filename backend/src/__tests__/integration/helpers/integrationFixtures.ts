import fs from 'fs';
import path from 'path';

export function ensureTenantIsolationFixture(): void {
  const fixturePath = path.join(process.cwd(), 'uploads', 'tenant-isolation-fixture.webp');
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  if (!fs.existsSync(fixturePath)) {
    fs.writeFileSync(fixturePath, Buffer.from('tenant-isolation-test-image'));
  }
}
