// Prints an ADMIN_PASSWORD_HASH for the environment. The password is read from stdin (not argv) so it
// doesn't land in shell history:   npm run hash-password   (then type the password and press Enter)
import { createInterface } from 'node:readline'
import { hashPassword } from '../server/auth.js'

const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: false })
process.stderr.write('Password (min 12 characters): ')
rl.once('line', async (pw) => {
  rl.close()
  if (pw.length < 12) {
    console.error('\nPassword must be at least 12 characters.')
    process.exit(1)
  }
  console.log(await hashPassword(pw))
})
