FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S moyu \
    && adduser -S moyu -G moyu
WORKDIR /app
COPY apps/api/target/moyu-api-*.jar /app/app.jar
RUN mkdir -p /app/data/uploads && chown -R moyu:moyu /app
USER moyu
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC -Dfile.encoding=UTF-8"
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
