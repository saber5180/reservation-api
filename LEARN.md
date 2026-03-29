# 📚 NestJS Learning Guide - Online Reservation System

This document guides you through the project step-by-step so you can **learn NestJS while building**.

---

## Step 0: What We Built (Overview)

We've set up a complete NestJS backend with:

| Module | Purpose |
|--------|---------|
| **Auth** | Register, login, JWT tokens |
| **Users** | User management, profile |
| **Professionals** | Doctor/dentist profiles, QR codes |
| **Availability** | Weekly schedule, time slots |
| **Reservations** | Bookings, status flow |

---

## Step 1: Understanding NestJS Structure

### The Request Flow

```
HTTP Request → Controller → Service → Database
                    ↓
              Response ← Controller
```

1. **Controller**: Receives the request, validates input (via DTOs), calls the service
2. **Service**: Contains business logic, talks to the database
3. **Entity**: Represents a database table

### Key Decorators You'll See

| Decorator | Where | Purpose |
|-----------|-------|---------|
| `@Module()` | Module class | Declares what the module contains |
| `@Controller('path')` | Controller class | Base route for this controller |
| `@Get()`, `@Post()`, `@Patch()` | Methods | HTTP method + sub-route |
| `@Injectable()` | Service class | Makes the class injectable (DI) |
| `@Body()`, `@Param()`, `@Query()` | Method params | Extract data from request |

### Dependency Injection (DI)

NestJS uses **constructor injection**:

```typescript
constructor(
  private readonly usersService: UsersService,  // Nest injects this automatically
) {}
```

You never write `new UsersService()` — Nest creates and injects it.

---

## Step 2: Running the Project

### Prerequisites

1. **PostgreSQL** installed and running
2. **Node.js** 18+

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your PostgreSQL credentials:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_DATABASE=reservation_system
   JWT_SECRET=your-super-secret-key
   ```

3. Create the database:
   ```sql
   CREATE DATABASE reservation_system;
   ```

4. Start the app:
   ```bash
   npm run start:dev
   ```

5. Test: Open http://localhost:3000 — you should see "Hello World!"

---

## Step 3: API Endpoints (Quick Reference)

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login |
| GET | `/professionals/:slug` | Get professional by slug |
| GET | `/professionals/:slug/booking` | Booking page data |
| GET | `/professionals/:slug/qr` | QR code (data URL) |
| GET | `/availability/slug/:slug` | Weekly availability |
| GET | `/availability/slots/:slug?date=2025-03-15` | Available slots for date |

### Protected (Bearer Token Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Current user |
| GET | `/users/me` | Current user profile |
| POST | `/professionals` | Create professional profile |
| POST | `/availability/professional/:id` | Set availability |
| GET | `/availability/professional/:id` | Get availability |
| POST | `/reservations` | Create reservation |
| GET | `/reservations` | List reservations |
| PATCH | `/reservations/:id/accept` | Accept (professional) |
| PATCH | `/reservations/:id/reject` | Reject (professional) |
| PATCH | `/reservations/:id/propose` | Propose new time |
| PATCH | `/reservations/:id/respond-proposal` | Client accepts/refuses |

---

## Step 4: Try It Out (Manual Testing)

### 1. Register a Professional

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@test.com","password":"123456","name":"Dr. Smith","role":"PROFESSIONAL"}'
```

Save the `access_token` from the response.

### 2. Create Professional Profile

```bash
curl -X POST http://localhost:3000/professionals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"specialty":"General Practitioner","slug":"dr-smith"}'
```

### 3. Set Availability (Mon 9-17, Wed 9-12)

```bash
curl -X POST http://localhost:3000/availability/professional/PROFESSIONAL_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"slots":[{"dayOfWeek":1,"startTime":"09:00","endTime":"17:00"},{"dayOfWeek":3,"startTime":"09:00","endTime":"12:00"}]}'
```

### 4. Get QR Code

```
GET http://localhost:3000/professionals/dr-smith/qr
```

Returns `{ dataUrl: "data:image/png;base64,..." }` — use in an `<img src="...">` tag.

### 5. Register a Client & Book

```bash
# Register client
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.com","password":"123456","name":"John Doe"}'

# Book (use client token + professional ID from step 2)
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -d '{"professionalId":"PROF_ID","slotStart":"2025-03-03T09:00:00Z","slotEnd":"2025-03-03T09:30:00Z"}'
```

---

## Step 5: Next Steps (Your Learning Path)

1. **Filter booked slots**: Update `AvailabilityService.getAvailableSlotsForDate` to exclude times already reserved
2. **Add notifications**: When doctor proposes a change, notify the client (email/SMS/push)
3. **Build a frontend**: React/Vue/Svelte app for the booking page and dashboard
4. **Add migrations**: Replace `synchronize: true` with TypeORM migrations for production
5. **Add tests**: Unit tests for services, e2e tests for API

---

## File Structure Explained

```
src/
├── main.ts                 # Bootstrap, ValidationPipe, CORS
├── app.module.ts           # Root module, TypeORM config, global JWT guard
│
├── auth/                   # Authentication
│   ├── auth.module.ts
│   ├── auth.controller.ts # POST /register, /login, GET /me
│   ├── auth.service.ts    # JWT generation, password validation
│   ├── strategies/        # Passport JWT strategy
│   ├── guards/            # JwtAuthGuard
│   └── decorators/        # @Public(), @CurrentUser()
│
├── users/
│   ├── users.module.ts
│   ├── users.service.ts   # CRUD, password hashing
│   └── entities/user.entity.ts
│
├── professionals/
│   ├── professionals.service.ts  # QR code generation
│   └── entities/professional.entity.ts
│
├── availability/
│   └── availability.service.ts  # Slot generation logic
│
└── reservations/
    └── entities/reservation.entity.ts  # Status enum
```

---

## Key Concepts to Explore

1. **Guards**: `JwtAuthGuard` protects routes; `@Public()` bypasses it
2. **Pipes**: `ValidationPipe` validates DTOs automatically
3. **TypeORM**: Entities map to tables; `@Column`, `@ManyToOne`, etc.
4. **ConfigModule**: `process.env` via `ConfigService`

Happy learning! 🚀
