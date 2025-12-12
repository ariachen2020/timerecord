# 多阶段构建
FROM node:22 AS builder

WORKDIR /app

# 在构建阶段不设置 NODE_ENV=production，以便安装 devDependencies
ENV NODE_ENV=development

# 复制根目录的 package files
COPY package*.json ./
COPY api/package*.json ./api/

# 安装所有依赖（包括 devDependencies）
RUN npm ci || npm install

# 复制所有源代码
COPY . .

# 构建前端
RUN npm run build

# 安装后端依赖
WORKDIR /app/api
RUN npm ci --only=production

# 生产阶段
FROM node:22-slim

WORKDIR /app

# 复制后端代码和依赖
COPY --from=builder /app/api ./api
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database

WORKDIR /app/api

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
