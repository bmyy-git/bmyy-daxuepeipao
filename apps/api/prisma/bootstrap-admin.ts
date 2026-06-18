import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const phone = process.env.ADMIN_PHONE
  const password = process.env.ADMIN_PASSWORD

  if (!email && !phone) throw new Error('Set ADMIN_EMAIL or ADMIN_PHONE before bootstrapping admin.')
  if (!password || password.length < 8) throw new Error('Set ADMIN_PASSWORD to at least 8 characters.')

  const existingAdmin = await prisma.user.findFirst({
    where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, active: true },
  })
  if (existingAdmin && process.env.BOOTSTRAP_ADMIN_FORCE !== 'true') {
    console.log('Active admin already exists. Nothing changed.')
    return
  }

  const user = await prisma.user.upsert({
    where: email ? { email } : { phone: phone! },
    update: {
      role: Role.ADMIN,
      active: true,
      passwordHash: await hash(password, 10),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    },
    create: {
      role: Role.ADMIN,
      email,
      phone,
      active: true,
      passwordHash: await hash(password, 10),
    },
  })

  console.log(`Admin ready: ${user.email || user.phone}`)
}

main()
  .finally(async () => prisma.$disconnect())
