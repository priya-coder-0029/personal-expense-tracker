// =====================================================
// PERSONAL EXPENSE TRACKER
// =====================================================


// =====================================================
// SERVER
// =====================================================

const SERVER_URL = "http://localhost:8080";


// =====================================================
// DOM ELEMENTS
// =====================================================

const totalAmount =
    document.getElementById("total-amount");

const userAmount =
    document.getElementById("user-amount");

const addButton =
    document.getElementById("add-amount");

const totalAmountButton =
    document.getElementById("total-amount-button");

const productTitle =
    document.getElementById("product-title");

const paymentMethod =
    document.getElementById("payment-method");

const errorMessage =
    document.getElementById("budget-error");

const productTitleError =
    document.getElementById("product-title-error");

const amount =
    document.getElementById("amount");

const expenditureValue =
    document.getElementById("expense-value");

const balanceValue =
    document.getElementById("balance-amount");

const list =
    document.getElementById("list");

const budgetHistory =
    document.getElementById("budget-history");

const expenseHistory =
    document.getElementById("previous-expense-list");


// =====================================================
// CURRENT BUDGET ID
// =====================================================

let currentBudgetId = null;


// =====================================================
// FORMAT MONEY
// =====================================================

function formatMoney(value)
{
    return Number(value || 0).toLocaleString("en-IN");
}


// =====================================================
// UPDATE BALANCE
// =====================================================

function updateBalance()
{
    const budget =
        Number(
            amount.innerText.replace(/,/g, "")
        ) || 0;

    const expenses =
        Number(
            expenditureValue.innerText.replace(/,/g, "")
        ) || 0;

    const balance =
        budget - expenses;

    balanceValue.innerText =
        formatMoney(balance);
}


// =====================================================
// SET NEW BUDGET
// =====================================================

totalAmountButton.addEventListener(
    "click",
    async function()
    {
        const budgetValue =
            totalAmount.value.trim();

        const budget =
            Number(budgetValue);


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (
            budgetValue === "" ||
            isNaN(budget) ||
            budget <= 0
        )
        {
            errorMessage.innerText =
                "Please enter a valid budget.";

            errorMessage.classList.remove("hide");

            return;
        }


        errorMessage.classList.add("hide");


        const date =
            new Date()
                .toISOString()
                .split("T")[0];


        try
        {
            console.log(
                "Saving budget:",
                budget
            );


            // -----------------------------------------
            // SEND BUDGET TO C++ SERVER
            // -----------------------------------------

            const response =
                await fetch(
                    SERVER_URL + "/set-budget",
                    {
                        method: "POST",

                        headers:
                        {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            new URLSearchParams(
                            {
                                amount: budget,
                                date: date
                            })
                    }
                );


            // -----------------------------------------
            // READ SERVER RESPONSE
            // -----------------------------------------

            const responseText =
                await response.text();


            console.log(
                "Budget server response:",
                responseText
            );


            if (!response.ok)
            {
                throw new Error(
                    responseText ||
                    "Budget could not be saved."
                );
            }


            // -----------------------------------------
            // GET NEW BUDGET ID
            // -----------------------------------------

            const newBudgetId =
                Number(
                    responseText.trim()
                );


            if (
                isNaN(newBudgetId) ||
                newBudgetId <= 0
            )
            {
                throw new Error(
                    "C++ server did not return a valid Budget ID."
                );
            }


            currentBudgetId =
                newBudgetId;


            localStorage.setItem(
                "currentBudgetId",
                currentBudgetId
            );


            console.log(
                "Current Budget ID:",
                currentBudgetId
            );


            // -----------------------------------------
            // UPDATE SUMMARY
            // -----------------------------------------

            amount.innerText =
                formatMoney(budget);

            expenditureValue.innerText =
                "0";

            balanceValue.innerText =
                formatMoney(budget);


            // -----------------------------------------
            // CLEAR CURRENT EXPENSE LIST
            // -----------------------------------------

            list.innerHTML =
                "";


            // -----------------------------------------
            // CLEAR INPUT
            // -----------------------------------------

            totalAmount.value =
                "";


            // -----------------------------------------
            // RELOAD HISTORY
            // -----------------------------------------

            await loadBudgetHistory();

            await loadExpenses();

            await loadExpenseHistory();

            updateBalance();


            alert(
                "New budget set successfully!"
            );
        }
        catch (error)
        {
            console.error(
                "SET BUDGET ERROR:",
                error
            );


            alert(
                "Could not save budget.\n\n" +
                error.message
            );
        }
    }
);


// =====================================================
// CREATE CURRENT EXPENSE ITEM
// =====================================================

function listCreator(
    expenseName,
    expenseAmount,
    expensePayment
)
{
    const item =
        document.createElement("div");


    item.classList.add(
        "sublist-content",
        "flex-space"
    );


    item.innerHTML = `
        <div class="expense-information">

            <p class="product">
                ${expenseName}
            </p>

            <p class="amount">
                ₹${formatMoney(expenseAmount)}
            </p>

            <p class="payment">
                Payment: ${expensePayment}
            </p>

        </div>
    `;


    // ---------------------------------------------
    // EDIT BUTTON
    // ---------------------------------------------

    const editButton =
        document.createElement("button");


    editButton.classList.add(
        "edit"
    );


    editButton.innerHTML =
        '<i class="fa-solid fa-pen-to-square"></i>';


    // ---------------------------------------------
    // DELETE BUTTON
    // ---------------------------------------------

    const deleteButton =
        document.createElement("button");


    deleteButton.classList.add(
        "delete"
    );


    deleteButton.innerHTML =
        '<i class="fa-solid fa-trash"></i>';


    item.appendChild(
        editButton
    );

    item.appendChild(
        deleteButton
    );


    list.appendChild(
        item
    );


    // ---------------------------------------------
    // EDIT
    // ---------------------------------------------

    editButton.addEventListener(
        "click",
        function()
        {
            productTitle.value =
                expenseName;

            userAmount.value =
                expenseAmount;

            paymentMethod.value =
                expensePayment;

            productTitle.focus();
        }
    );


    // ---------------------------------------------
    // DELETE
    // ---------------------------------------------

    deleteButton.addEventListener(
        "click",
        function()
        {
            const confirmDelete =
                confirm(
                    "Delete this expense from the list?"
                );


            if (!confirmDelete)
            {
                return;
            }


            const deletedAmount =
                Number(expenseAmount);


            const currentExpenses =
                Number(
                    expenditureValue.innerText
                        .replace(/,/g, "")
                ) || 0;


            const newExpenses =
                Math.max(
                    0,
                    currentExpenses -
                    deletedAmount
                );


            expenditureValue.innerText =
                formatMoney(newExpenses);


            updateBalance();


            item.remove();


            console.log(
                "Expense removed from current list."
            );
        }
    );
}


// =====================================================
// ADD EXPENSE
// =====================================================

addButton.addEventListener(
    "click",
    async function()
    {
        // ---------------------------------------------
        // CHECK BUDGET
        // ---------------------------------------------

        if (
            !currentBudgetId ||
            Number(currentBudgetId) <= 0
        )
        {
            alert(
                "Please set a budget first."
            );

            return;
        }


        // ---------------------------------------------
        // CHECK PRODUCT
        // ---------------------------------------------

        if (
            !productTitle.value.trim()
        )
        {
            productTitleError.innerText =
                "Please enter a product.";

            productTitleError.classList.remove(
                "hide"
            );

            return;
        }


        // ---------------------------------------------
        // CHECK AMOUNT
        // ---------------------------------------------

        if (
            !userAmount.value ||
            Number(userAmount.value) <= 0
        )
        {
            productTitleError.innerText =
                "Please enter a valid amount.";

            productTitleError.classList.remove(
                "hide"
            );

            return;
        }


        productTitleError.classList.add(
            "hide"
        );


        const expenseName =
            productTitle.value.trim();

        const expenseAmount =
            Number(userAmount.value);

        const selectedPayment =
            paymentMethod.value;

        const date =
            new Date()
                .toISOString()
                .split("T")[0];


        try
        {
            // -----------------------------------------
            // SAVE EXPENSE TO C++ SERVER
            // -----------------------------------------

            const response =
                await fetch(
                    SERVER_URL + "/add-expense",
                    {
                        method: "POST",

                        headers:
                        {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            new URLSearchParams(
                            {
                                title:
                                    expenseName,

                                amount:
                                    expenseAmount,

                                category:
                                    "General",

                                paymentMethod:
                                    selectedPayment,

                                date:
                                    date,

                                budgetId:
                                    currentBudgetId
                            })
                    }
                );


            const responseText =
                await response.text();


            if (!response.ok)
            {
                throw new Error(
                    responseText ||
                    "Expense could not be saved."
                );
            }


            // -----------------------------------------
            // CLEAR INPUTS
            // -----------------------------------------

            productTitle.value =
                "";

            userAmount.value =
                "";


            // -----------------------------------------
            // RELOAD CURRENT EXPENSES
            // -----------------------------------------

            await loadExpenses();

            await loadExpenseHistory();


            console.log(
                "Expense saved successfully!"
            );
        }
        catch (error)
        {
            console.error(
                "EXPENSE ERROR:",
                error
            );


            alert(
                "Could not save expense.\n\n" +
                error.message
            );
        }
    }
);


// =====================================================
// LOAD CURRENT BUDGET
// =====================================================

async function loadCurrentBudget()
{
    try
    {
        const response =
            await fetch(
                SERVER_URL +
                "/latest-budget"
            );


        if (!response.ok)
        {
            throw new Error(
                "Could not load budget."
            );
        }


        const data =
            await response.text();


        console.log(
            "Latest budget:",
            data
        );


        // ---------------------------------------------
        // NO BUDGET
        // ---------------------------------------------

        if (!data.trim())
        {
            currentBudgetId =
                null;

            amount.innerText =
                "0";

            expenditureValue.innerText =
                "0";

            balanceValue.innerText =
                "0";

            return;
        }


        // ---------------------------------------------
        // EXPECTED FORMAT:
        //
        // 3 | 5000.000000 | 2026-08-25
        // ---------------------------------------------

        const parts =
            data.trim().split(" | ");


        if (parts.length < 3)
        {
            throw new Error(
                "Invalid budget data received."
            );
        }


        currentBudgetId =
            Number(parts[0]);


        const budgetAmount =
            Number(parts[1]);


        if (
            isNaN(currentBudgetId) ||
            currentBudgetId <= 0
        )
        {
            throw new Error(
                "Invalid Budget ID."
            );
        }


        amount.innerText =
            formatMoney(budgetAmount);


        localStorage.setItem(
            "currentBudgetId",
            currentBudgetId
        );


        console.log(
            "Current Budget ID:",
            currentBudgetId
        );
    }
    catch (error)
    {
        console.error(
            "BUDGET LOADING ERROR:",
            error
        );
    }
}


// =====================================================
// LOAD CURRENT BUDGET EXPENSES
// =====================================================

async function loadExpenses()
{
    if (
        !currentBudgetId ||
        Number(currentBudgetId) <= 0
    )
    {
        expenditureValue.innerText =
            "0";

        balanceValue.innerText =
            formatMoney(
                Number(
                    amount.innerText.replace(/,/g, "")
                ) || 0
            );

        list.innerHTML =
            "";

        return;
    }


    try
    {
        const response =
            await fetch(
                SERVER_URL +
                "/expenses?budgetId=" +
                encodeURIComponent(
                    currentBudgetId
                )
            );


        if (!response.ok)
        {
            const errorText =
                await response.text();

            throw new Error(
                errorText ||
                "Could not load expenses."
            );
        }


        const data =
            await response.text();


        list.innerHTML =
            "";


        let totalExpenses =
            0;


        if (data.trim())
        {
            const rows =
                data.trim().split("\n");


            rows.forEach(
                function(row)
                {
                    const parts =
                        row.split(" | ");


                    if (parts.length >= 7)
                    {
                        const expenseName =
                            parts[1];

                        const expenseAmount =
                            Number(parts[2]);

                        const expensePayment =
                            parts[5];


                        if (
                            !isNaN(
                                expenseAmount
                            )
                        )
                        {
                            totalExpenses +=
                                expenseAmount;


                            listCreator(
                                expenseName,
                                expenseAmount,
                                expensePayment
                            );
                        }
                    }
                }
            );
        }


        expenditureValue.innerText =
            formatMoney(totalExpenses);


        updateBalance();


        console.log(
            "Current expenses loaded."
        );
    }
    catch (error)
    {
        console.error(
            "EXPENSE LOADING ERROR:",
            error
        );
    }
}


// =====================================================
// LOAD BUDGET HISTORY
// =====================================================

async function loadBudgetHistory()
{
    if (!budgetHistory)
    {
        return;
    }


    try
    {
        const response =
            await fetch(
                SERVER_URL +
                "/budgets"
            );


        if (!response.ok)
        {
            throw new Error(
                "Could not load budget history."
            );
        }


        const data =
            await response.text();


        budgetHistory.innerHTML =
            "";


        if (!data.trim())
        {
            budgetHistory.innerHTML =
                "<p>No budget history yet.</p>";

            return;
        }


        const rows =
            data.trim().split("\n");


        rows.forEach(
            function(row)
            {
                const parts =
                    row.split(" | ");


                if (parts.length >= 3)
                {
                    const budgetAmount =
                        Number(parts[1]);

                    const budgetDate =
                        parts[2];


                    const item =
                        document.createElement(
                            "div"
                        );


                    item.classList.add(
                        "budget-history-item"
                    );


                    // IMPORTANT:
                    // Backticks are required here.

                    item.innerHTML = `
                        <span>
                            ₹${formatMoney(budgetAmount)}
                        </span>

                        <span>
                            ${budgetDate}
                        </span>
                    `;


                    budgetHistory.appendChild(
                        item
                    );
                }
            }
        );


        console.log(
            "Budget history loaded."
        );
    }
    catch (error)
    {
        console.error(
            "BUDGET HISTORY ERROR:",
            error
        );


        budgetHistory.innerHTML =
            "<p>Could not load budget history.</p>";
    }
}


// =====================================================
// LOAD EXPENSE HISTORY
// =====================================================

async function loadExpenseHistory()
{
    if (!expenseHistory)
    {
        console.error(
            "Expense history element not found."
        );

        return;
    }


    if (
        !currentBudgetId ||
        Number(currentBudgetId) <= 0
    )
    {
        expenseHistory.innerHTML =
            "<p>No previous expenses yet.</p>";

        return;
    }


    try
    {
        const response =
            await fetch(
                SERVER_URL +
                "/expenses?budgetId=" +
                encodeURIComponent(
                    currentBudgetId
                )
            );


        if (!response.ok)
        {
            const errorText =
                await response.text();

            throw new Error(
                errorText ||
                "Could not load expense history."
            );
        }


        const data =
            await response.text();


        expenseHistory.innerHTML =
            "";


        if (!data.trim())
        {
            expenseHistory.innerHTML =
                "<p>No previous expenses yet.</p>";

            return;
        }


        const rows =
            data.trim().split("\n");


        let hasExpenses =
            false;


        rows.forEach(
            function(row)
            {
                const parts =
                    row.split(" | ");


                if (parts.length >= 7)
                {
                    hasExpenses =
                        true;


                    const expenseName =
                        parts[1];

                    const expenseAmount =
                        Number(parts[2]);

                    const expensePayment =
                        parts[5];

                    const expenseDate =
                        parts[6];


                    const item =
                        document.createElement(
                            "div"
                        );


                    item.classList.add(
                        "expense-history-item"
                    );


                    item.innerHTML = `
                        <div class="expense-history-information">

                            <p class="product">
                                ${expenseName}
                            </p>

                            <p class="amount">
                                ₹${formatMoney(expenseAmount)}
                            </p>

                            <p class="payment">
                                Payment: ${expensePayment}
                            </p>

                            <p class="date">
                                Date: ${expenseDate}
                            </p>

                        </div>
                    `;


                    expenseHistory.appendChild(
                        item
                    );
                }
            }
        );


        if (!hasExpenses)
        {
            expenseHistory.innerHTML =
                "<p>No previous expenses yet.</p>";
        }


        console.log(
            "Expense history loaded."
        );
    }
    catch (error)
    {
        console.error(
            "EXPENSE HISTORY ERROR:",
            error
        );


        expenseHistory.innerHTML =
            "<p>Could not load expense history.</p>";
    }
}


// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener(
    "DOMContentLoaded",
    async function()
    {
        console.log(
            "Expense Tracker loaded."
        );


        await loadCurrentBudget();

        await loadExpenses();

        await loadBudgetHistory();

        await loadExpenseHistory();

        updateBalance();


        console.log(
            "All data loaded successfully."
        );
    }
);