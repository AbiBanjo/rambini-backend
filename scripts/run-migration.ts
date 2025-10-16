import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

// ...adjust path if your config lives elsewhere...
const cfg = require('../src/database/typeorm-cli.config.ts');

function applyEnvOverrides(opts: DataSourceOptions): DataSourceOptions {
	// ...apply only if env vars present...
	const out: DataSourceOptions = { ...opts };

	if (process.env.MIGRATION_DATABASE_URL) {
		// prefer full URL if provided
		// @ts-ignore
		out.url = process.env.MIGRATION_DATABASE_URL;
		console.log('Using MIGRATION_DATABASE_URL override');
	}

	if (process.env.MIGRATION_DB_HOST) {
		// @ts-ignore
		out.host = process.env.MIGRATION_DB_HOST;
		console.log(`Using MIGRATION_DB_HOST override: ${process.env.MIGRATION_DB_HOST}`);
	}
	if (process.env.MIGRATION_DB_PORT) {
		const p = parseInt(process.env.MIGRATION_DB_PORT, 10);
		if (!isNaN(p)) {
			// @ts-ignore
			out.port = p;
			console.log(`Using MIGRATION_DB_PORT override: ${p}`);
		}
	}
	if (process.env.MIGRATION_DB_USERNAME) {
		// @ts-ignore
		out.username = process.env.MIGRATION_DB_USERNAME;
	}
	if (process.env.MIGRATION_DB_PASSWORD) {
		// @ts-ignore
		out.password = process.env.MIGRATION_DB_PASSWORD;
	}
	if (process.env.MIGRATION_DB_DATABASE) {
		// @ts-ignore
		out.database = process.env.MIGRATION_DB_DATABASE;
	}
	return out;
}

function getDataSource(from: any): DataSource {
	// If a DataSource instance was exported directly
	if (from instanceof DataSource) {
		// construct a new DataSource based on exported options + overrides
		const base = (from as any).options as DataSourceOptions;
		const opts = applyEnvOverrides(base);
		return new DataSource(opts);
	}
	// Handle exports like: export default dataSource or export const dataSource
	const candidate = from.default ?? from.dataSource ?? from;
	// If candidate is already a DataSource instance
	if (candidate instanceof DataSource) {
		const base = (candidate as any).options as DataSourceOptions;
		const opts = applyEnvOverrides(base);
		return new DataSource(opts);
	}
	// Otherwise assume it's DataSourceOptions and construct a DataSource
	const opts = applyEnvOverrides(candidate as DataSourceOptions);
	return new DataSource(opts);
}

(async () => {
	try {
		const dataSource = getDataSource(cfg);
		await dataSource.initialize();
		console.log('DataSource initialized. Running migrations...');
		await dataSource.runMigrations();
		console.log('Migrations finished.');
		await dataSource.destroy();
		process.exit(0);
	} catch (err: any) {
		// Provide clearer guidance for DNS/network errors
		if (err && (err.code === 'EAI_AGAIN' || err.errno === -3001)) {
			console.error('DNS/network error resolving DB host:', err.hostname || err);
			console.error('Suggestions:');
			console.error('- Check your internet connection and DNS.');
			console.error('- Ensure the DB hostname is correct and reachable from your machine.');
			console.error('- If using AWS RDS, ensure the instance is public or you are on a VPN/bastion host that can reach it.');
			console.error('- As a quick workaround, run migrations against a local DB or override the target using environment variables:');
			console.error('  MIGRATION_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/db npm run migration:run');
			console.error('  or set MIGRATION_DB_HOST/MIGRATION_DB_PORT/MIGRATION_DB_USERNAME/MIGRATION_DB_PASSWORD/MIGRATION_DB_DATABASE');
		} else {
			console.error('Error running migrations:', err);
		}
		process.exit(1);
	}
})();
