FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# --omit=optional：跳过仅供本地/CI 测试使用的 better-sqlite3（原生模块），避免在 alpine 上编译
RUN npm install --omit=optional

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node","dist/main.js"]
