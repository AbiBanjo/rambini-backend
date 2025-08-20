# Rambini Backend Project Structure

## Overview
This document describes the folder structure and organization of the Rambini Backend API project.

## Root Directory Structure
```
rambini-backend/
├── src/                    # Source code
├── test/                   # Test files
├── scripts/                # Database and utility scripts
├── docs/                   # Documentation
├── deployments/            # Deployment configurations
├── logs/                   # Application logs (created at runtime)
├── .env.example           # Environment variables template
├── .env                   # Environment variables (local)
├── .gitignore            # Git ignore rules
├── package.json           # Node.js dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── nest-cli.json          # NestJS CLI configuration
├── jest.config.js         # Jest testing configuration
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── Dockerfile             # Docker container configuration
├── docker-compose.yml     # Docker Compose for development
└── README.md              # Project overview and setup
```

## Source Code Structure (`src/`)

### Core Application Files
- `main.ts` - Application entry point
- `app.module.ts` - Root application module
- `app.controller.ts` - Root application controller
- `app.service.ts` - Root application service

### Feature Modules (`src/modules/`)
Each feature module follows the same structure:

#### User Module (`src/modules/user/`)
- `user.module.ts` - Module definition
- `user.controller.ts` - HTTP endpoints
- `user.service.ts` - Business logic
- `dto/` - Data transfer objects
  - `create-user.dto.ts`
  - `update-user.dto.ts`
  - `user-response.dto.ts`
- `entities/` - Database entities
  - `user.entity.ts`
  - `address.entity.ts`
- `repositories/` - Custom repository methods
  - `user.repository.ts`

#### Vendor Module (`src/modules/vendor/`)
- `vendor.module.ts`
- `vendor.controller.ts`
- `vendor.service.ts`
- `dto/`
- `entities/`
- `repositories/`

#### Menu Module (`src/modules/menu/`)
- `menu.module.ts`
- `menu.controller.ts`
- `menu.service.ts`
- `dto/`
- `entities/`
- `repositories/`

#### Order Module (`src/modules/order/`)
- `order.module.ts`
- `order.controller.ts`
- `order.service.ts`
- `dto/`
- `entities/`
- `repositories/`

#### Payment Module (`src/modules/payment/`)
- `payment.module.ts`
- `payment.controller.ts`
- `payment.service.ts`
- `dto/`
- `entities/`
- `repositories/`

#### Notification Module (`src/modules/notification/`)
- `notification.module.ts`
- `notification.controller.ts`
- `notification.service.ts`
- `dto/`
- `entities/`
- `repositories/`

#### Admin Module (`src/modules/admin/`)
- `admin.module.ts`
- `admin.controller.ts`
- `admin.service.ts`
- `dto/`
- `entities/`
- `repositories/`

### Common Components (`src/common/`)
Shared components used across modules:

#### Guards (`src/common/guards/`)
- `jwt-auth.guard.ts` - JWT authentication guard
- `roles.guard.ts` - Role-based access control
- `throttler.guard.ts` - Rate limiting guard

#### Interceptors (`src/common/interceptors/`)
- `transform.interceptor.ts` - Response transformation
- `logging.interceptor.ts` - Request/response logging
- `cache.interceptor.ts` - Response caching

#### Filters (`src/common/filters/`)
- `http-exception.filter.ts` - HTTP exception handling
- `validation.filter.ts` - Validation error handling
- `database.filter.ts` - Database error handling

#### Decorators (`src/common/decorators/`)
- `roles.decorator.ts` - Role requirements
- `current-user.decorator.ts` - Current user extraction
- `api-response.decorator.ts` - API response metadata

#### Middleware (`src/common/middleware/`)
- `logger.middleware.ts` - Request logging
- `cors.middleware.ts` - CORS configuration
- `helmet.middleware.ts` - Security headers

### Configuration (`src/config/`)
- `configuration.ts` - Environment configuration
- `logger.config.ts` - Winston logger configuration
- `database.config.ts` - Database configuration
- `redis.config.ts` - Redis configuration

### Database (`src/database/`)
- `database.module.ts` - Database module configuration
- `migrations/` - Database migration files
- `seeds/` - Database seed files

### Authentication (`src/auth/`)
- `auth.module.ts` - Authentication module
- `auth.service.ts` - Authentication logic
- `jwt.strategy.ts` - JWT strategy
- `local.strategy.ts` - Local authentication strategy

### Utilities (`src/utils/`)
- `helpers.ts` - Common utility functions
- `validators.ts` - Custom validation functions
- `constants.ts` - Application constants
- `enums.ts` - Application enums

## Test Structure (`test/`)
- `jest-e2e.json` - End-to-end test configuration
- `app.e2e-spec.ts` - Application end-to-end tests
- `auth.e2e-spec.ts` - Authentication end-to-end tests

## Scripts (`scripts/`)
- `init-db.sql` - Database initialization script
- `seed-data.sql` - Sample data seeding
- `migrate.sh` - Database migration script

## Documentation (`docs/`)
- `PROJECT_STRUCTURE.md` - This file
- `API_DOCUMENTATION.md` - API endpoint documentation
- `DATABASE_SCHEMA.md` - Database schema documentation
- `DEPLOYMENT.md` - Deployment instructions
- `DEVELOPMENT.md` - Development guidelines

## Key Design Principles

### 1. Modular Architecture
- Each feature is a separate module
- Modules are self-contained with clear interfaces
- Dependencies are explicitly declared

### 2. Separation of Concerns
- Controllers handle HTTP concerns
- Services contain business logic
- Repositories handle data access
- DTOs define data contracts

### 3. Dependency Injection
- Use NestJS dependency injection container
- Services are injectable and testable
- Configuration is centralized

### 4. Consistent Naming
- Use kebab-case for files and folders
- Use PascalCase for classes
- Use camelCase for methods and properties

### 5. Error Handling
- Centralized exception filters
- Consistent error response format
- Proper HTTP status codes

### 6. Validation
- Input validation using class-validator
- Response transformation using class-transformer
- Custom validation pipes when needed

## Development Workflow

### 1. Adding New Features
1. Create module folder structure
2. Define entities and DTOs
3. Implement service with business logic
4. Create controller with endpoints
5. Add tests
6. Update documentation

### 2. Database Changes
1. Create migration file
2. Update entity definitions
3. Test migration locally
4. Deploy to staging
5. Deploy to production

### 3. API Changes
1. Update DTOs if needed
2. Modify service logic
3. Update controller endpoints
4. Update Swagger documentation
5. Add/update tests

## File Naming Conventions

- **Modules**: `*.module.ts`
- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Entities**: `*.entity.ts`
- **DTOs**: `*.dto.ts`
- **Repositories**: `*.repository.ts`
- **Guards**: `*.guard.ts`
- **Interceptors**: `*.interceptor.ts`
- **Filters**: `*.filter.ts`
- **Decorators**: `*.decorator.ts`
- **Middleware**: `*.middleware.ts`
- **Tests**: `*.spec.ts` (unit) or `*.e2e-spec.ts` (e2e)

## Import Organization

1. External libraries (NestJS, TypeORM, etc.)
2. Internal modules
3. Common components
4. Relative imports (same module)
5. Type imports

Example:
```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { UserService } from '../user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
``` 