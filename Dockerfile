FROM gcc:13

WORKDIR /app

COPY backend/main.cpp .
COPY backend/httplib.h .
COPY backend/sqlite3.c .
COPY backend/sqlite3.h .

RUN gcc -c sqlite3.c -o sqlite3.o

RUN g++ main.cpp sqlite3.o -o backend \
    -std=c++17 \
    -pthread

RUN mkdir -p /data

EXPOSE 8080

CMD ["./backend"]