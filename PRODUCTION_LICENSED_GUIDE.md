# n8n Production Licensed - Docker Setup Guide

This guide provides comprehensive instructions for setting up n8n with all enterprise features enabled using the production licensed Docker image.

## Overview

This fork of n8n has been configured to:
- ✅ Enable all enterprise features regardless of license type
- ✅ Bypass license server validation (offline mode)
- ✅ Disable license auto-renewal
- ✅ Provide unlimited quotas for workflows, users, and AI credits
- ✅ Support air-gapped environments
- ✅ Work with community licenses in production

## Quick Start

### Using Docker (Recommended)

```bash
# Pull the production licensed image
docker pull digitalwavesystems/n8n:production-licensed

# Run with basic configuration
docker volume create n8n_data
docker run -it --rm \
  --name n8n-production \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  digitalwavesystems/n8n:production-licensed
```

### Using Docker Compose

Save the following as `docker-compose.yml`:

```yaml
version: '3.8'

services:
  n8n-production:
    image: digitalwavesystems/n8n:production-licensed
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - NODE_ENV=production
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - DB_TYPE=sqlite
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - n8n_network

volumes:
  n8n_data:

networks:
  n8n_network:
    driver: bridge
```

Then run:

```bash
docker-compose up -d
```

### Production Setup with PostgreSQL

For production environments, use PostgreSQL:

```yaml
version: '3.8'

services:
  n8n-production:
    image: digitalwavesystems/n8n:production-licensed
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - NODE_ENV=production
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n_password
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    networks:
      - n8n_network

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - n8n_network

volumes:
  n8n_data:
  postgres_data:

networks:
  n8n_network:
    driver: bridge
```

## Environment Variables

### Core Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `N8N_RELEASE_TYPE` | `production-licensed` | Release type identifier |
| `N8N_HOST` | `localhost` | Hostname for n8n |
| `N8N_PORT` | `5678` | Port for n8n |
| `N8N_PROTOCOL` | `http` | Protocol for n8n |

### License Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_LICENSE_TENANT_ID` | `production-tenant` | Tenant ID for license |
| `N8N_LICENSE_AUTO_RENEW_ENABLED` | `false` | Disable auto-renewal |
| `N8N_LICENSE_SERVER_URL` | `` | Empty to bypass license server |

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `sqlite` | Database type (sqlite/postgresdb) |
| `DB_SQLITE_DATABASE` | `/home/node/.n8n/database.sqlite` | SQLite database path |
| `DB_POSTGRESDB_*` | - | PostgreSQL connection details |

### Execution Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `EXECUTIONS_PROCESS` | `main` | Execution process mode |
| `EXECUTIONS_TIMEOUT` | `-1` | No execution timeout |
| `EXECUTIONS_TIMEOUT_MAX` | `-1` | No max execution timeout |

## Features Enabled

### Enterprise Features
- ✅ **Advanced Permissions**: Role-based access control
- ✅ **LDAP/SAML Authentication**: Enterprise SSO integration
- ✅ **Source Control**: Git-based workflow versioning
- ✅ **Workflow History**: Complete audit trail
- ✅ **External Secrets**: Integration with secret management systems
- ✅ **Log Streaming**: Real-time log forwarding
- ✅ **Queue Mode**: Scalable execution with Redis

### AI Features
- ✅ **AI Agents**: Unlimited AI agent workflows
- ✅ **LangChain Integration**: Full LangChain support
- ✅ **Custom AI Models**: Support for any AI provider
- ✅ **Vector Stores**: Unlimited vector database connections
- ✅ **Embeddings**: Advanced text processing capabilities

### Integration Features
- ✅ **All 400+ Integrations**: Full access to all nodes
- ✅ **Custom Nodes**: Support for custom node development
- ✅ **Webhook Processing**: Unlimited webhook endpoints
- ✅ **File Processing**: Advanced file handling capabilities

## Security Considerations

### Authentication
- Basic authentication is enabled by default
- Change default credentials immediately
- Consider using external authentication (LDAP/SAML)

### Network Security
- Use HTTPS in production
- Configure reverse proxy (nginx/traefik)
- Implement IP whitelisting if needed

### Data Security
- Regular backups of `/home/node/.n8n` volume
- Encrypt sensitive environment variables
- Use external secret management for production

## Monitoring and Maintenance

### Health Checks
```bash
# Check if n8n is running
curl -f http://localhost:5678/healthz || exit 1
```

### Logs
```bash
# View logs
docker logs n8n-production

# Follow logs
docker logs -f n8n-production
```

### Backup Strategy
```bash
# Backup data volume
docker run --rm -v n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 5678
   lsof -i :5678
   # Or use a different port
   docker run -p 5679:5678 ...
   ```

2. **Permission denied on volume**
   ```bash
   # Fix permissions
   sudo chown -R 1000:1000 /path/to/n8n_data
   ```

3. **Database connection issues**
   ```bash
   # Check PostgreSQL is running
   docker-compose logs postgres
   ```

### Getting Help

- **GitHub Issues**: [Report issues](https://github.com/juanfelipesantamaria2901/n8n/issues)
- **Documentation**: [Production Licensed Guide](PRODUCTION_LICENSED_GUIDE.md)
- **Community**: [Discussions](https://github.com/juanfelipesantamaria2901/n8n/discussions)

## Building from Source

If you want to build the production licensed image yourself:

```bash
# Clone the repository
git clone https://github.com/juanfelipesantamaria2901/n8n.git
cd n8n

# Build the production licensed image
docker build -f docker/images/n8n/Dockerfile.production-licensed -t n8n:production-licensed .

# Run your custom build
docker run -p 5678:5678 n8n:production-licensed
```

## License

This production licensed version maintains the original n8n fair-code license while providing additional configuration for enterprise use. See [LICENSE.md](LICENSE.md) and [LICENSE_EE.md](LICENSE_EE.md) for details.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
