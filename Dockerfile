FROM gcc:13

WORKDIR /app

# Backend files
COPY backend/main.cpp .
COPY backend/httplib.h .
COPY backend/sqlite3.c .
COPY backend/sqlite3.h .

# Frontend files
COPY frontend ./frontend

# Compile SQLite
RUN gcc -c sqlite3.c -o sqlite3.o

# Compile C++ backend
RUN g++ main.cpp sqlite3.o -o backend \
    -std=c++17 \
    -pthread

# Create database directory
RUN mkdir -p /data

EXPOSE 8080

CMD ["./backend"]