import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

/**
 * 
 * @param {string} a 
 * @param {string} b 
 * @returns The comparison result for lowest to greatest
 */
const sortAccounts = (a, b) => parseInt(a, 10) - parseInt(b, 10);

/**
 * 
 * @param {{ number & string }} account 
 * @param {{ [accountName: string]: string}} accountDictionary 
 * @param { number[] } sliceArr 
 */
const findAccount = (account, accountDictionary, sliceArr) => Number.isNaN(account) ? Object
  .keys(accountDictionary)
  .sort(sortAccounts)
  .slice(...sliceArr)
  .map(acc => parseInt(acc, 10))
  .pop()
  : parseInt(account, 10);

/**
 * 
 * @param { Date } period 
 * @param {[{ PERIOD: Date }]} entries 
 * @param { (entry: { PERIOD: Date }, acc: number) => boolean} predicate 
 * @param { number } init 
 * @returns { number }
 */
const findDate = (period, entries, predicate, init) =>
  period instanceof Date && isNaN(period) ?
    entries.reduce((acc, entry) => predicate(entry, acc) ? entry.PERIOD.getTime() : acc, init)
    : period.getTime();

export default connect(state => {
  let balance = [];

  /* YOUR CODE GOES HERE */
  const { userInput, journalEntries } = state;
  const { startAccount, endAccount, startPeriod, endPeriod } = userInput;

  if (startAccount !== undefined && endAccount !== undefined && startPeriod !== undefined && endPeriod !== undefined) {
    const descriptionByAccount = state.accounts.reduce(
      (acc, { ACCOUNT, LABEL }) =>
        ACCOUNT in acc ? acc :
          {
            ...acc,
            [ACCOUNT]: LABEL
          },
      {}
    );

    const aStartAccount = findAccount(startAccount, descriptionByAccount, [0, 1]);
    const aEndAccount = findAccount(endAccount, descriptionByAccount, [-1]);
    const aStartPeriod = findDate(
      startPeriod,
      journalEntries,
      (entry, acc) => entry.PERIOD.getTime() <= acc,
      Date.now()
    );
    const aEndPeriod = findDate(
      endPeriod,
      journalEntries,
      (entry, acc) => entry.PERIOD.getTime() >= acc,
      new Date('Jan 01 1970').getTime()
    );
    const entries = journalEntries
      .filter(({ ACCOUNT, PERIOD }) =>
        ACCOUNT in descriptionByAccount
        && ACCOUNT >= aStartAccount
        && ACCOUNT <= aEndAccount
        && PERIOD.getTime() >= aStartPeriod
        && PERIOD.getTime() <= aEndPeriod
      )
      .reduce((acc, { ACCOUNT, CREDIT, DEBIT }) => {
        if (!(ACCOUNT in acc)) {
          acc[ACCOUNT] = {
            DEBIT: 0,
            CREDIT: 0,
            BALANCE: 0,
            DESCRIPTION: descriptionByAccount[ACCOUNT],
          };
        }

        acc[ACCOUNT].DEBIT += DEBIT;
        acc[ACCOUNT].CREDIT += CREDIT;
        acc[ACCOUNT].BALANCE = acc[ACCOUNT].DEBIT - acc[ACCOUNT].CREDIT;

        return acc;
      }, {});
    balance = Object.keys(entries)
      .sort(sortAccounts)
      .reduce((acc, key) =>
        [
          ...acc,
          {
            ACCOUNT: parseInt(key, 10),
            DESCRIPTION: entries[key].DESCRIPTION,
            DEBIT: entries[key].DEBIT,
            CREDIT: entries[key].CREDIT,
            BALANCE: entries[key].BALANCE,
          }
        ],
        []
      );
  }

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput
  };
})(BalanceOutput);
