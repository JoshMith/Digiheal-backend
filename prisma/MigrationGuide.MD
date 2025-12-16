# 🏥 DKUT Medical Center - Database Migration Guide

## Project Objectives Alignment

This migration guide addresses your specific project objectives:

| Objective | Schema Changes Required |
|-----------|------------------------|
| **1. Patient portal for symptom submission & virtual consultations** | VirtualConsultation model, enhanced Patient fields |
| **2. ML-based triage model (Urgent/Medium/Advice)** | Updated HealthAssessment with TriageCategory enum |
| **3. Automated scheduling with priority-based rules** | AppointmentSlot model, enhanced scheduling fields |
| **4. SMS/email reminders (Twilio/Nodemailer)** | NotificationChannel model, enhanced Notification |
| **5. Feedback dashboard for ratings & trends** | Feedback model with analytics support |

---

## Step-by-Step Migration Process

### Prerequisites
```bash
# Ensure you're in your backend project directory
cd dkut-backend

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Backup database (if you have existing data)
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d).sql
```

---

## Step 1: Update Prisma Schema

Replace your `prisma/schema.prisma` with the updated version provided in `schema.prisma` file.

### Key Changes Summary:

#### New Enums Added:
- `TriageCategory` - For ML triage classification (URGENT, MEDIUM, ADVICE)
- `ConsultationType` - IN_PERSON vs VIRTUAL
- `FeedbackCategory` - SERVICE, STAFF, FACILITY, APPOINTMENT, OTHER
- `NotificationChannel` - EMAIL, SMS, PUSH, IN_APP
- `StudentStatus` - ACTIVE, INACTIVE, GRADUATED, ON_LEAVE
- `WaitlistStatus` - WAITING, CALLED, CANCELLED, CONVERTED
- `SlotStatus` - AVAILABLE, BOOKED, BLOCKED

#### New Models Added:
- `VirtualConsultation` - For telemedicine/video consultations
- `AppointmentSlot` - For availability management
- `Feedback` - For patient feedback & ratings
- `Waitlist` - For queue management
- `NotificationPreference` - User notification settings

#### Enhanced Models:
- `User` - Added email verification, password reset fields
- `Patient` - Added email, avatar, student status, preferred communication
- `Staff` - Added avatar, bio, availability status, feedback relation
- `HealthAssessment` - Added triage category, reviewed by staff
- `Notification` - Added channel, scheduled time, retry count
- `Appointment` - Added consultation type, reminder sent flags

---

## Step 2: Create Migration

```bash
# Generate migration from schema changes
npx prisma migrate dev --name add_triage_virtual_feedback

# If you encounter issues, try:
npx prisma migrate dev --create-only --name add_triage_virtual_feedback

# Then apply:
npx prisma migrate deploy
```

### Alternative: Reset Database (Development Only!)
```bash
# WARNING: This deletes all data
npx prisma migrate reset

# Or for a fresh start:
npx prisma db push --force-reset
```

---

## Step 3: Generate Prisma Client

```bash
# Regenerate the Prisma client with new types
npx prisma generate
```

---

## Step 4: Update Seed Data

Update your `prisma/seed.ts` to include new models. See the `seed.ts` file provided.

```bash
# Run seed
npx prisma db seed
```

---

## Step 5: Verify Migration

```bash
# Open Prisma Studio to verify data
npx prisma studio
```

### Verification Checklist:
- [ ] All new tables created (virtual_consultations, appointment_slots, feedbacks, waitlists, notification_preferences)
- [ ] New enums available (TriageCategory, ConsultationType, etc.)
- [ ] Existing data preserved (if applicable)
- [ ] Relations working correctly
- [ ] Indexes created for performance

---

## Step 6: Update Backend Controllers

After migration, update your controllers to use new models. Key files to update:

1. **healthAssessment.controller.ts** - Add triage category handling
2. **appointment.controller.ts** - Add slot management, virtual consultations
3. **notification.controller.ts** - Add multi-channel support
4. **feedback.controller.ts** (new) - Handle patient feedback
5. **virtualConsultation.controller.ts** (new) - Telemedicine features

---

## Troubleshooting

### Common Issues:

**Error: Migration failed due to existing data**
```bash
# Option 1: Create a data migration script
# Option 2: Reset database (dev only)
npx prisma migrate reset
```

**Error: Enum type does not exist**
```bash
# Ensure enums are defined before models that use them
# Check migration order in prisma/migrations/
```

**Error: Foreign key constraint violation**
```bash
# Ensure related records exist before creating dependent records
# Check cascade delete settings
```

---

## Next Steps After Migration

1. **Update TypeScript types** in frontend to match new schema
2. **Create new API endpoints** for VirtualConsultation, Feedback, Waitlist
3. **Implement notification service** with Twilio/Nodemailer integration
4. **Update ML service** to return TriageCategory
5. **Build feedback dashboard** for analytics

---

*Generated for DKUT Medical Center Digital Health Management System*
*Aligned with Project Objectives: AI-Priority Patient Triage & Virtual Consultation System*