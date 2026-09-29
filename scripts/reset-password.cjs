// Reset a Stash user's password directly in the database.
//
// Runs INSIDE the stash-backend container (it needs the backend's bcrypt +
// Prisma client). Pipe it in over SSH from your own terminal — the new
// password is passed as an env var so it never lands in a file:
//
//   PowerShell:
//     Get-Content scripts\reset-password.cjs | ssh unraid "docker exec -i -e EMAIL=you@example.com -e NEWPW='YourNewPassword' -w /app/packages/backend stash-backend node -"
//
//   bash:
//     ssh unraid "docker exec -i -e EMAIL=you@example.com -e NEWPW='YourNewPassword' -w /app/packages/backend stash-backend node -" < scripts/reset-password.cjs
//
// Sets mustChangePassword=false since you chose the password yourself.
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const { EMAIL, NEWPW } = process.env;
if (!EMAIL || !NEWPW) {
  console.error('Set EMAIL and NEWPW env vars.');
  process.exit(1);
}
if (NEWPW.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const prisma = new PrismaClient();
(async () => {
  const passwordHash = await bcrypt.hash(NEWPW, 10);
  const user = await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash, mustChangePassword: false },
    select: { email: true, role: true },
  });
  console.log(`Password updated for ${user.email} (${user.role})`);
})()
  .catch((e) => {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
