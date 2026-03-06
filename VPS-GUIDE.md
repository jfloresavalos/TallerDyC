# VPS Guide — TallerDyc

## Datos de conexión

| Item | Valor |
|------|-------|
| **IP** | `212.85.12.168` |
| **Usuario** | `root` |
| **Contraseña** | `NelaGlow2025` |
| **Puerto app** | `3003` |
| **Ruta VPS** | `/var/www/tallerdyc` |
| **PM2 name** | `tallerdyc` |

## Conectar por SSH

```bash
ssh root@212.85.12.168
```

## Primer deploy (solo una vez)

### 1. En el VPS — clonar el repo

```bash
cd /var/www
git clone https://github.com/TU_USUARIO/tallerdyc.git tallerdyc
cd tallerdyc
```

### 2. Crear el .env en el VPS

```bash
nano /var/www/tallerdyc/.env
```

Contenido:
```env
DATABASE_URL="postgresql://nelaglow_user:NelaGlow2025@localhost:5432/tallerdyc_db?schema=public"
NODE_ENV="production"
```

> Ajusta el nombre de la base de datos según corresponda.

### 3. Crear la base de datos (si no existe)

```bash
sudo -u postgres psql -c "CREATE DATABASE tallerdyc_db;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tallerdyc_db TO nelaglow_user;"
```

### 4. Setup inicial

```bash
cd /var/www/tallerdyc
chmod +x deploy.sh
./deploy.sh --setup
```

### 5. Configurar Nginx

```bash
nano /etc/nginx/sites-available/tallerdyc
```

Contenido:
```nginx
server {
    server_name tallerdyc.com www.tallerdyc.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar y recargar:
```bash
ln -s /etc/nginx/sites-available/tallerdyc /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 6. SSL con Certbot (si tienes dominio)

```bash
certbot --nginx -d tallerdyc.com -d www.tallerdyc.com
```

---

## Deploy de actualizaciones

Desde local (PC de casa):
```bash
git push origin main
```

En el VPS:
```bash
cd /var/www/tallerdyc && ./deploy.sh
```

O desde local via SSH:
```bash
ssh root@212.85.12.168 "cd /var/www/tallerdyc && ./deploy.sh"
```

---

## Comandos útiles en el VPS

```bash
pm2 list                          # Ver todos los procesos
pm2 logs tallerdyc                # Ver logs en tiempo real
pm2 restart tallerdyc             # Reiniciar app
pm2 stop tallerdyc                # Detener app
```

---

## Proyectos en el VPS

| PM2 | Puerto | URL |
|-----|--------|-----|
| `nelaglow` | 3001 | https://admin.nelaglow.com |
| `nelaglow-page` | 3002 | https://nelaglow.com |
| `tallerdyc` | 3003 | (pendiente dominio) |
