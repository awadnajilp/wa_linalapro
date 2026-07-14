# Deployment Documentation for wa.linalapro.com

## Path
/var/www/wa.linalapro.com

## Database
- Database Name: walinalapro
- User: walinalapro
- Password: walinalapro123

## Ports & Services
- Application Port: 8003
- Process Manager: PM2 (Process Name: whatsway)
- Web Server: Nginx (Proxying port 80 to 5005)

## Super Admin
- Username: awad@linalapro.com
- Password: 9394Jzn!

## Notes for Future Agents
- Use this directory for modifications related to wa.linalapro.com.
- PM2 handles restarts. If changes are made to .env or code, run `npm run build` and `pm2 restart whatsway`.
