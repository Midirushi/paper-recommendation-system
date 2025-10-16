#!/bin/bash

# 论文推荐系统一键部署脚本
# 使用方法: ./init-system.sh

set -e

echo "=========================================="
echo "论文个性化推荐系统 - 自动部署脚本"
echo "=========================================="
echo ""

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker未安装，正在安装..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        echo "✅ Docker安装完成"
    else
        echo "✅ Docker已安装: $(docker --version)"
    fi
}

# 检查Docker Compose是否安装
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose未安装，正在安装..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo "✅ Docker Compose安装完成"
    else
        echo "✅ Docker Compose已安装: $(docker-compose --version)"
    fi
}

# 配置环境变量
configure_env() {
    echo ""
    echo "正在配置环境变量..."
    
    if [ ! -f ../backend/.env ]; then
        cp ../backend/.env.example ../backend/.env
        echo "⚠️  请编辑 backend/.env 文件，填入必要的API密钥"
        echo "   - OPENAI_API_KEY"
        echo "   - ANTHROPIC_API_KEY"
        echo ""
        read -p "是否现在编辑配置文件？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} ../backend/.env
        fi
    else
        echo "✅ 环境配置文件已存在"
    fi
}

# 构建并启动服务
start_services() {
    echo ""
    echo "正在构建并启动所有服务..."
    docker-compose up -d --build
    
    echo ""
    echo "等待服务启动..."
    sleep 10
}

# 初始化数据库
init_database() {
    echo ""
    echo "正在初始化数据库..."
    
    # 等待PostgreSQL准备就绪
    echo "等待PostgreSQL启动..."
    for i in {1..30}; do
        if docker exec paper_db pg_isready -U paperuser > /dev/null 2>&1; then
            echo "✅ PostgreSQL已就绪"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # 初始化数据库结构
    docker exec paper_backend python -c "from app.database import init_db; init_db()"
    echo "✅ 数据库初始化完成"
}

# 测试服务
test_services() {
    echo ""
    echo "测试服务状态..."
    
    # 测试后端健康检查
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ 后端服务正常"
    else
        echo "❌ 后端服务异常"
    fi
    
    # 测试前端
    if curl -s http://localhost > /dev/null; then
        echo "✅ 前端服务正常"
    else
        echo "❌ 前端服务异常"
    fi
    
    # 测试Redis
    if docker exec paper_redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis服务正常"
    else
        echo "❌ Redis服务异常"
    fi
}

# 显示访问信息
show_info() {
    echo ""
    echo "=========================================="
    echo "✨ 部署完成！"
    echo "=========================================="
    echo ""
    echo "📌 访问地址："
    echo "   前端界面: http://localhost"
    echo "   API文档:  http://localhost:8000/docs"
    echo "   Celery监控: http://localhost:5555"
    echo ""
    echo "📋 常用命令："
    echo "   查看日志: docker-compose logs -f"
    echo "   停止服务: docker-compose down"
    echo "   重启服务: docker-compose restart"
    echo ""
    echo "📚 更多文档请参考 README.md"
    echo "=========================================="
}

# 主函数
main() {
    check_docker
    check_docker_compose
    configure_env
    start_services
    init_database
    test_services
    show_info
}

# 执行主函数
main