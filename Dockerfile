# Use Node.js 18 Alpine para imagem menor
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Definir variável de ambiente para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar todas as dependências primeiro
RUN npm install

# Compilar TypeScript
RUN npm run build

# Instalar apenas dependências de produção
RUN npm prune --production

# Copiar código fonte
COPY src/ ./src/
COPY config/ ./config/

# Criar diretório para logs
RUN mkdir -p logs

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Alterar propriedade dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta (se necessário para health checks)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
