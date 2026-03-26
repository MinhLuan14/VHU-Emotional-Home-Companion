# Bước 1: Sử dụng hình ảnh Maven để build dự án
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY . .
# Build và bỏ qua chạy thử (Tests) để nhanh hơn
RUN mvn clean package -DskipTests

# Bước 2: Sử dụng hình ảnh Java gọn nhẹ để chạy app
FROM openjdk:17.0.1-jdk-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Cấu hình RAM thấp cho gói miễn phí của Render (512MB)
ENV JAVA_OPTS="-Xmx300m -Xms300m"

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]