#include <iostream>
#include <string>

#include "sqlite3.h"
#include "httplib.h"

using namespace std;


// =====================================================
// DATABASE HELPER
// =====================================================

bool executeSQL(sqlite3* DB, const string& sql)
{
    char* errorMessage = nullptr;

    int result = sqlite3_exec(
        DB,
        sql.c_str(),
        nullptr,
        nullptr,
        &errorMessage
    );

    if (result != SQLITE_OK)
    {
        cout << "SQLite Error: ";

        if (errorMessage != nullptr)
        {
            cout << errorMessage << endl;
            sqlite3_free(errorMessage);
        }

        return false;
    }

    return true;
}


// =====================================================
// MAIN
// =====================================================

int main()
{
    // =================================================
    // DATABASE CONNECTION
    // =================================================

    sqlite3* DB = nullptr;

    int result = sqlite3_open(
        "expenses.db",
        &DB
    );

    if (result != SQLITE_OK)
    {
        cout << "Database connection failed!" << endl;

        if (DB != nullptr)
        {
            sqlite3_close(DB);
        }

        return 1;
    }

    cout << "Database connected successfully!" << endl;


    // =================================================
    // CREATE BUDGET TABLE
    // =================================================

    const string createBudgetTable =
        "CREATE TABLE IF NOT EXISTS budgets ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "amount REAL NOT NULL,"
        "date TEXT NOT NULL"
        ");";


    if (!executeSQL(DB, createBudgetTable))
    {
        cout << "Could not create budgets table." << endl;

        sqlite3_close(DB);

        return 1;
    }

    cout << "Budget table ready!" << endl;


    // =================================================
    // CREATE TRANSACTIONS TABLE
    // =================================================

    const string createTransactionTable =
        "CREATE TABLE IF NOT EXISTS transactions ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "title TEXT NOT NULL,"
        "amount REAL NOT NULL,"
        "type TEXT NOT NULL,"
        "category TEXT,"
        "payment_method TEXT,"
        "date TEXT NOT NULL,"
        "budget_id INTEGER"
        ");";


    if (!executeSQL(DB, createTransactionTable))
    {
        cout << "Could not create transactions table." << endl;

        sqlite3_close(DB);

        return 1;
    }

    cout << "Transactions table ready!" << endl;


    // =================================================
    // HTTP SERVER
    // =================================================

    httplib::Server server;


    // =================================================
    // CORS
    // =================================================

    server.set_error_handler(
        [](const httplib::Request& req,
           httplib::Response& res)
        {
            res.set_header(
                "Access-Control-Allow-Origin",
                "*"
            );
        }
    );


    // =================================================
    // SET BUDGET
    // =================================================

    server.Post(
        "/set-budget",
        [&](const httplib::Request& req,
            httplib::Response& res)
        {
            res.set_header(
                "Access-Control-Allow-Origin",
                "*"
            );


            // Check required data
            if (!req.has_param("amount") ||
                !req.has_param("date"))
            {
                res.status = 400;

                res.set_content(
                    "Missing budget data",
                    "text/plain"
                );

                return;
            }


            string budgetAmount =
                req.get_param_value("amount");

            string date =
                req.get_param_value("date");


            // Insert budget
            string sql =
                "INSERT INTO budgets (amount, date) "
                "VALUES (" +
                budgetAmount +
                ", '" +
                date +
                "');";


            char* errorMessage = nullptr;


            int result = sqlite3_exec(
                DB,
                sql.c_str(),
                nullptr,
                nullptr,
                &errorMessage
            );


            if (result != SQLITE_OK)
            {
                cout << "Budget save error: ";

                if (errorMessage != nullptr)
                {
                    cout << errorMessage << endl;

                    sqlite3_free(errorMessage);
                }

                res.status = 500;

                res.set_content(
                    "Failed to save budget",
                    "text/plain"
                );

                return;
            }


            // Get new budget ID
            sqlite3_int64 budgetId =
                sqlite3_last_insert_rowid(DB);


            cout << endl;
            cout << "-----------------------------" << endl;
            cout << "New Budget Created" << endl;
            cout << "Budget ID: "
                 << budgetId
                 << endl;

            cout << "Budget Amount: "
                 << budgetAmount
                 << endl;

            cout << "Date: "
                 << date
                 << endl;

            cout << "-----------------------------" << endl;


            // Send budget ID to JavaScript
            res.status = 200;

            res.set_content(
                to_string(budgetId),
                "text/plain"
            );
        }
    );


    // =================================================
    // GET LATEST BUDGET
    // =================================================

    server.Get(
        "/latest-budget",
        [&](const httplib::Request& req,
            httplib::Response& res)
        {
            res.set_header(
                "Access-Control-Allow-Origin",
                "*"
            );


            const char* sql =
                "SELECT id, amount, date "
                "FROM budgets "
                "ORDER BY id DESC "
                "LIMIT 1;";


            sqlite3_stmt* statement = nullptr;


            int result = sqlite3_prepare_v2(
                DB,
                sql,
                -1,
                &statement,
                nullptr
            );


            if (result != SQLITE_OK)
            {
                res.status = 500;

                res.set_content(
                    "Could not load latest budget",
                    "text/plain"
                );

                return;
            }


            if (sqlite3_step(statement) == SQLITE_ROW)
            {
                int id =
                    sqlite3_column_int(
                        statement,
                        0
                    );


                double budget =
                    sqlite3_column_double(
                        statement,
                        1
                    );


                const unsigned char* date =
                    sqlite3_column_text(
                        statement,
                        2
                    );


                string dateText =
                    date
                    ? reinterpret_cast<const char*>(date)
                    : "";


                string output =
                    to_string(id) +
                    " | " +
                    to_string(budget) +
                    " | " +
                    dateText;


                res.status = 200;

                res.set_content(
                    output,
                    "text/plain"
                );
            }
            else
            {
                // No budget found
                res.status = 200;

                res.set_content(
                    "",
                    "text/plain"
                );
            }


            sqlite3_finalize(statement);
        }
    );


    // =================================================
    // GET BUDGET HISTORY
    // =================================================

    server.Get(
        "/budgets",
        [&](const httplib::Request& req,
            httplib::Response& res)
        {
            res.set_header(
                "Access-Control-Allow-Origin",
                "*"
            );


            const char* sql =
                "SELECT id, amount, date "
                "FROM budgets "
                "ORDER BY id DESC;";


            sqlite3_stmt* statement = nullptr;


            int result = sqlite3_prepare_v2(
                DB,
                sql,
                -1,
                &statement,
                nullptr
            );


            if (result != SQLITE_OK)
            {
                res.status = 500;

                res.set_content(
                    "Could not load budget history",
                    "text/plain"
                );

                return;
            }


            string output = "";


            while (
                sqlite3_step(statement) == SQLITE_ROW
            )
            {
                int id =
                    sqlite3_column_int(
                        statement,
                        0
                    );


                double budget =
                    sqlite3_column_double(
                        statement,
                        1
                    );


                const unsigned char* date =
                    sqlite3_column_text(
                        statement,
                        2
                    );


                string dateText =
                    date
                    ? reinterpret_cast<const char*>(date)
                    : "";


                output +=
                    to_string(id) +
                    " | " +
                    to_string(budget) +
                    " | " +
                    dateText +
                    "\n";
            }


            sqlite3_finalize(statement);


            res.status = 200;

            res.set_content(
                output,
                "text/plain"
            );
        }
    );


    // =================================================
    // ADD EXPENSE
    // =================================================

    server.Post(
        "/add-expense",
        [&](const httplib::Request& req,
            httplib::Response& res)
        {
            res.set_header(
                "Access-Control-Allow-Origin",
                "*"
            );


            // Check required parameters
            if (!req.has_param("title") ||
                !req.has_param("amount") ||
                !req.has_param("category") ||
                !req.has_param("paymentMethod") ||
                !req.has_param("date") ||
                !req.has_param("budgetId"))
            {
                res.status = 400;

                res.set_content(
                    "Missing expense data",
                    "text/plain"
                );

                return;
            }


            string title =
                req.get_param_value("title");

            string expenseAmount =
                req.get_param_value("amount");

            string category =
                req.get_param_value("category");

            string paymentMethod =
                req.get_param_value("paymentMethod");

            string date =
                req.get_param_value("date");

            string budgetId =
                req.get_param_value("budgetId");


            // Insert expense
            string sql =
                "INSERT INTO transactions "
                "(title, amount, type, category, "
                "payment_method, date, budget_id) "
                "VALUES ('" +
                title +
                "', " +
                expenseAmount +
                ", 'expense', '" +
                category +
                "', '" +
                paymentMethod +
                "', '" +
                date +
                "', " +
                budgetId +
                ");";


            char* errorMessage = nullptr;


            int result = sqlite3_exec(
                DB,
                sql.c_str(),
                nullptr,
                nullptr,
                &errorMessage
            );


            if (result != SQLITE_OK)
            {
                cout << "Expense save error: ";

                if (errorMessage != nullptr)
                {
                    cout << errorMessage << endl;

                    sqlite3_free(errorMessage);
                }

                res.status = 500;

                res.set_content(
                    "Failed to save expense",
                    "text/plain"
                );

                return;
            }


            cout << "Expense saved: "
                 << title
                 << " | ₹"
                 << expenseAmount
                 << " | Budget ID: "
                 << budgetId
                 << endl;


            res.status = 200;

            res.set_content(
                "Expense saved successfully!",
                "text/plain"
            );
        }
    );


    // =================================================
    // GET EXPENSES BY BUDGET ID
    // =================================================

    server.Get(
        "/expenses",
        [&](const httplib::Request& req,
            httplib::Response& res)
        {
            res.set_header(
                "Access-Control-Allow-Origin",
                "*"
            );


            // Check budget ID
            if (!req.has_param("budgetId"))
            {
                res.status = 400;

                res.set_content(
                    "Budget ID required",
                    "text/plain"
                );

                return;
            }


            string budgetId =
                req.get_param_value("budgetId");


            string sql =
                "SELECT id, title, amount, type, "
                "category, payment_method, date "
                "FROM transactions "
                "WHERE type = 'expense' "
                "AND budget_id = " +
                budgetId +
                " "
                "ORDER BY id DESC;";


            sqlite3_stmt* statement = nullptr;


            int result = sqlite3_prepare_v2(
                DB,
                sql.c_str(),
                -1,
                &statement,
                nullptr
            );


            if (result != SQLITE_OK)
            {
                res.status = 500;

                res.set_content(
                    "Could not load expenses",
                    "text/plain"
                );

                return;
            }


            string output = "";


            while (
                sqlite3_step(statement) == SQLITE_ROW
            )
            {
                int id =
                    sqlite3_column_int(
                        statement,
                        0
                    );


                const unsigned char* title =
                    sqlite3_column_text(
                        statement,
                        1
                    );


                double expenseAmount =
                    sqlite3_column_double(
                        statement,
                        2
                    );


                const unsigned char* type =
                    sqlite3_column_text(
                        statement,
                        3
                    );


                const unsigned char* category =
                    sqlite3_column_text(
                        statement,
                        4
                    );


                const unsigned char* payment =
                    sqlite3_column_text(
                        statement,
                        5
                    );


                const unsigned char* date =
                    sqlite3_column_text(
                        statement,
                        6
                    );


                string titleText =
                    title
                    ? reinterpret_cast<const char*>(title)
                    : "";


                string typeText =
                    type
                    ? reinterpret_cast<const char*>(type)
                    : "";


                string categoryText =
                    category
                    ? reinterpret_cast<const char*>(category)
                    : "";


                string paymentText =
                    payment
                    ? reinterpret_cast<const char*>(payment)
                    : "";


                string dateText =
                    date
                    ? reinterpret_cast<const char*>(date)
                    : "";


                output +=
                    to_string(id) +
                    " | " +
                    titleText +
                    " | " +
                    to_string(expenseAmount) +
                    " | " +
                    typeText +
                    " | " +
                    categoryText +
                    " | " +
                    paymentText +
                    " | " +
                    dateText +
                    "\n";
            }


            sqlite3_finalize(statement);


            res.status = 200;

            res.set_content(
                output,
                "text/plain"
            );
        }
    );


    // =================================================
    // START SERVER
    // =================================================

    cout << endl;
    cout << "========================================" << endl;
    cout << "       PERSONAL EXPENSE TRACKER" << endl;
    cout << "========================================" << endl;
    cout << "Database connected successfully." << endl;
    cout << "Server running at:" << endl;
    cout << "http://localhost:8080" << endl;
    cout << "========================================" << endl;


    server.listen(
        "0.0.0.0",
        8080
    );


    // =================================================
    // CLOSE DATABASE
    // =================================================

    sqlite3_close(DB);

    return 0;
}