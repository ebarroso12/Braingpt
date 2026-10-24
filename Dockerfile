FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3030 DATABASE_PATH=/data/braingpt.sqlite
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node app ./app
COPY --chown=node:node migrations ./migrations
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3030
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3030/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "app/server.ts"]
