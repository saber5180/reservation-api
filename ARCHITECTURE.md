# 🏗️ Online Reservation System - Architecture Design

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [NestJS Architecture Explained](#nestjs-architecture-explained)
3. [Database Schema](#database-schema)
4. [API Structure](#api-structure)
5. [Module Organization](#module-organization)
6. [Reservation Flow](#reservation-flow)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ONLINE RESERVATION PLATFORM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CLIENT FLOW                    PROFESSIONAL FLOW                           │
│   ───────────                    ─────────────────                          │
│                                                                              │
│   ┌─────────┐                    ┌─────────────────┐                         │
│   │ QR Code │                    │ Doctor Dashboard│                         │
│   │  Scan   │                    │                 │                         │
│   └────┬────┘                    │ • View bookings │                         │
│        │                         │ • Accept/Reject │                         │
│        ▼                         │ • Propose time  │                         │
│   ┌─────────────┐                └────────┬────────┘                         │
│   │ Booking     │                         │                                  │
│   │ Page        │◄────────────────────────┤                                  │
│   │             │   Notifications          │                                  │
│   │ • Register  │                         │                                  │
│   │ • See slots │                         │                                  │
│   │ • Book      │                         │                                  │
│   └──────┬──────┘                         │                                  │
│          │                                │                                  │
│          └────────────┬───────────────────┘                                  │
│                       │                                                      │
│                       ▼                                                      │
│              ┌─────────────────┐                                             │
│              │   NestJS API    │                                             │
│              │   (REST)        │                                             │
│              └────────┬────────┘                                             │
│                       │                                                      │
│                       ▼                                                      │
│              ┌─────────────────┐                                             │
│              │   PostgreSQL    │                                             │
│              │   Database      │                                             │
│              └─────────────────┘                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## NestJS Architecture Explained

### What is NestJS?

NestJS is a **progressive Node.js framework** that uses:
- **TypeScript** by default
- **Modular architecture** (inspired by Angular)
- **Dependency Injection** (DI) for loose coupling
- **Decorators** for clean, declarative code

### The Three Pillars: Modules → Controllers → Services

```
┌──────────────────────────────────────────────────────────────────┐
│                         MODULE                                     │
│  (Container that groups related functionality)                     │
│                                                                    │
│   ┌─────────────────┐         ┌─────────────────┐                 │
│   │   CONTROLLER    │         │    SERVICE      │                 │
│   │                 │         │                 │                 │
│   │ • Handles HTTP  │ ──────► │ • Business      │                 │
│   │   requests      │  uses   │   logic         │                 │
│   │ • Validates     │         │ • Database      │                 │
│   │   input         │         │   operations    │                 │
│   │ • Returns       │ ◄────── │ • No HTTP       │                 │
│   │   response      │         │   knowledge     │                 │
│   └─────────────────┘         └─────────────────┘                 │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 1. **Modules** (`@Module()`)
- **Purpose**: Organize the application into cohesive blocks
- **Analogy**: Like chapters in a book—each module handles one domain
- **Example**: `AuthModule`, `UsersModule`, `ReservationsModule`

### 2. **Controllers** (`@Controller()`)
- **Purpose**: Handle incoming HTTP requests and return responses
- **Responsibility**: Route definition, request validation, response formatting
- **Does NOT**: Contain business logic (that's the service's job)

### 3. **Services** (`@Injectable()`)
- **Purpose**: Contain business logic, database operations, external API calls
- **Responsibility**: Reusable logic that can be injected anywhere
- **Does NOT**: Know about HTTP, routes, or request/response objects

### Why This Separation?
- **Testability**: You can test services without HTTP
- **Reusability**: Same service can be used by multiple controllers
- **Maintainability**: Change business logic without touching routes

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │   Professional   │       │   Reservation   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ email           │       │ userId (FK)     │──┐    │ professionalId  │──┐
│ password        │       │ specialty       │  │    │ clientId (FK)   │  │
│ name            │       │ bio             │  │    │ slotStart       │  │
│ phone           │       │ bookingLink     │  │    │ slotEnd         │  │
│ role            │       │ (QR URL)       │  │    │ status          │  │
│ createdAt       │       │ createdAt      │  │    │ proposedSlot*   │  │
└────────┬────────┘       └─────────────────┘  │    │ createdAt      │  │
         │                                     │    └─────────────────┘  │
         │ 1:1                                 │             │            │
         └────────────────────────────────────┘             │            │
                                                            │            │
┌─────────────────┐       ┌─────────────────┐               │            │
│  Availability   │       │  TimeSlot       │               │            │
├─────────────────┤       ├─────────────────┤               │            │
│ id (PK)         │       │ id (PK)         │               │            │
│ professionalId  │──┐    │ professionalId  │───────────────┘            │
│ dayOfWeek       │  │    │ startTime       │                            │
│ startTime       │  │    │ endTime         │                            │
│ endTime         │  │    │ date           │                             │
└─────────────────┘  │    │ isBooked       │                             │
                     │    └─────────────────┘                             │
                     │                                                     │
                     └─────────────────────────────────────────────────────┘
```

### Tables Summary

| Table | Purpose |
|-------|---------|
| **users** | All users (clients + professionals). `role` distinguishes them |
| **professionals** | Extended profile for doctors/dentists. Links to User |
| **reservations** | Bookings with status flow |
| **availability** | Weekly schedule (e.g., Mon 9-17, Tue 9-12) |
| **time_slots** | Generated slots for a specific date (or we compute on-the-fly) |

*Note: We can simplify by computing available slots from availability + reservations without a separate time_slots table.*

---

## API Structure

### REST Endpoints (Preview)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Auth** |
| POST | `/auth/register` | Register (client or professional) | No |
| POST | `/auth/login` | Login | No |
| GET | `/auth/me` | Get current user | Yes |
| **Users** |
| GET | `/users/me` | Get profile | Yes |
| PATCH | `/users/me` | Update profile | Yes |
| **Professionals** |
| POST | `/professionals` | Create professional profile | Yes |
| GET | `/professionals/:id` | Get professional (public) | No |
| GET | `/professionals/:slug/booking` | Public booking page data | No |
| **Reservations** |
| POST | `/reservations` | Create reservation (client) | Yes |
| GET | `/reservations` | List (filtered by role) | Yes |
| PATCH | `/reservations/:id/accept` | Accept (professional) | Yes |
| PATCH | `/reservations/:id/reject` | Reject (professional) | Yes |
| PATCH | `/reservations/:id/propose` | Propose new time | Yes |
| PATCH | `/reservations/:id/respond-proposal` | Client accepts/refuses | Yes |

---

## Module Organization

```
src/
├── app.module.ts              # Root module - imports all
├── main.ts                    # Bootstrap
│
├── auth/                      # Authentication
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── strategies/            # JWT, etc.
│
├── users/                     # User management
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── entities/
│
├── professionals/             # Doctor/Dentist profiles
│   ├── professionals.module.ts
│   ├── professionals.controller.ts
│   ├── professionals.service.ts
│   └── entities/
│
├── reservations/              # Booking logic
│   ├── reservations.module.ts
│   ├── reservations.controller.ts
│   ├── reservations.service.ts
│   └── entities/
│
├── availability/              # Calendar / slots
│   ├── availability.module.ts
│   ├── availability.controller.ts
│   └── availability.service.ts
│
└── common/                    # Shared (guards, decorators, etc.)
    ├── guards/
    ├── decorators/
    └── filters/
```

---

## Reservation Flow

```
                    CLIENT                          PROFESSIONAL
                       │                                   │
                       │  1. Create Reservation           │
                       │  (status: PENDING)               │
                       │─────────────────────────────────►│
                       │                                   │
                       │                    2. Accept / Reject / Propose
                       │                                   │
                       │  If ACCEPTED ───────────────────►│ status: CONFIRMED
                       │  If REJECTED ───────────────────►│ status: REJECTED
                       │  If PROPOSED ───────────────────►│ status: CHANGE_PROPOSED
                       │                                   │
                       │  3. Client responds to proposal   │
                       │  (accept new time / refuse)       │
                       │─────────────────────────────────►│
                       │                                   │
```

### Status Enum
```typescript
enum ReservationStatus {
  PENDING = 'PENDING',           // Just created
  ACCEPTED = 'ACCEPTED',         // Doctor accepted (same as CONFIRMED for same slot)
  CONFIRMED = 'CONFIRMED',       // Final confirmed state
  REJECTED = 'REJECTED',         // Doctor rejected
  CHANGE_PROPOSED = 'CHANGE_PROPOSED',  // Doctor proposed new time
}
```

---

## QR Code System

Each professional gets a **unique booking URL**:
```
https://your-domain.com/booking/{professionalId}
```
or
```
https://your-domain.com/booking/{slug}
```

- The QR code encodes this URL
- When scanned, the client's phone opens the web page
- The page fetches professional info + available slots from the API
- No app download required!

---

## Next Steps

1. ✅ Architecture designed
2. ⏭️ Create NestJS project with `nest new`
3. ⏭️ Configure PostgreSQL + TypeORM
4. ⏭️ Build Auth module
5. ⏭️ Build Users module
6. ⏭️ Build Professionals module
7. ⏭️ Build Reservations module
8. ⏭️ Build Availability/Calendar logic
9. ⏭️ Add QR code generation
