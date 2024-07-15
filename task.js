const request = require('request');

const URL = 'https://interview.adpeai.com/api/v2/get-task';

function getTransactionsIds(empId, trans) {
  const res = [];
  const prvYear = new Date().getFullYear() - 1;
  trans.forEach((transaction) => {
    if (transaction.type === 'alpha' && transaction.employee.id === empId && transaction.timeStamp.match(prvYear)) {
      res.push(transaction.transactionID);
    }
  })
  return res;
}

/**
 * Filters transactions for the previous year and computes top earner
 * @param {*} transactions 
 * @returns last year highest earned employees { amount: number, employees: [] }
 */
function getLastYearTopEarner(transactions) {
  if (!transactions || !transactions.length) return;

  // store each employee amount for the last year
  const employeeHashMap = {};

  // keeps track of employees with highes amount
  let highestSum = {
    amount: 0,
    employees: [],
  };
  const prvYear = new Date().getFullYear() - 1;
  for (let i = 0; i < transactions.length; i++) {
    let trans = transactions[i];
    if (!trans.timeStamp.match(prvYear)) continue;
    else {
      const empId = trans.employee.id;
      const amount = trans.amount;
      if (!employeeHashMap[empId]) {
        employeeHashMap[empId] = amount;
      } else {
        employeeHashMap[empId] += amount;
      }
      if (employeeHashMap[empId] > highestSum.amount) {
        highestSum.amount = employeeHashMap[empId];
        highestSum.employees = [empId];
      } else if (employeeHashMap[empId] === highestSum.amount) {
        highestSum.employees.push(empId);
      }
    }
  }

  // console.log(employeeHashMap);

  return highestSum;
}

/**
 * Makes a http GET request to 'https://interview.adpeai.com/api/v2/get-task'
 * @returns response body
 */
function getTransactions() {
  return new Promise((resolve, rej) => {
    console.log('making http GET call to ', URL);
    request.get(URL, (err, res) => {
      if (err) return rej(err);
      console.log('http GET request is success.');
      return resolve(JSON.parse(res.body));
      
    });
  });
}
/**
 * Performs POST call to the 'https://interview.adpeai.com/api/v2/submit-task'
 * and logs the status code and body.
 * @param {*} id 
 * @param {*} transactionIDs 
 */
function postTransactionIds(id, transactionIDs) {
  return new Promise((resolve, reject) => {
    if (!id) return reject('No id to make post call');
    console.log(`-------- ${transactionIDs}`);
    const body = {
      id,
      result: transactionIDs
    }
    const postUrl = 'https://interview.adpeai.com/api/v2/submit-task';

    console.log('performing http POST call with the id and transactionsIDs as payload.\n')
    request.post({
      headers: { 'content-type': 'application/json' },
      url: postUrl,
      body: JSON.stringify(body)
    }, function (error, response, body) {
      if (error) return reject(error);
      console.log(`Status code: ${response.statusCode}`);
      console.log(`Body: ${body}`);
      return resolve();
    });
  });
}

getTransactions()
  .then((body) => {
    const id = body.id;
    const trans = body.transactions;

    console.log('computing last year top earner');
    const lastYearTopEarner = getLastYearTopEarner(trans);
    console.log('Top earner is computed sucessfully');

    // all alpha transactions IDS with highest amount;
    const transactionIDs = [];

    console.log('filtering alpha transactions of the highest amount employee');
    lastYearTopEarner.employees.forEach((empId) => {
      const ids = getTransactionsIds(empId, trans);
      if (ids.length) transactionIDs.push(...ids);
    });
    console.log('aplha transactions ids filtered successfully');

    return { id, transactionIDs };
  })
  .then((data) => {
    postTransactionIds(data.id, data.transactionIDs)
      .then(() => {
        console.log("Task finished thank you...");
      })
      .catch((e) => {
        throw e;
      });
  })
  .catch((e) => {
    console.error(e);
  })