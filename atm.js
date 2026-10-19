
class BankAccount {
  constructor(accountNumber, pin, balance) {
    this.accountNumber = accountNumber;
    this.pin = pin;
    this.balance = balance;
  }

  checkBalance() {
    return this.balance;
  }

  withdraw(amount) {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    if (amount > this.balance) {
      throw new Error("Insufficient account balance");
    }

    this.balance -= amount;
  }

  deposit(amount) {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    this.balance += amount;
  }

  validatePin(pin) {
    return this.pin === pin;
  }
}

class Card {
  constructor(account) {
    this.account = account;
  }

  getAccount() {
    return this.account;
  }
}

class CashDispenser {
  constructor(cashAvailable) {
    this.cashAvailable = cashAvailable;
  }

  dispense(amount) {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    if (amount % 100 !== 0) {
      throw new Error("Amount must be in multiples of 100");
    }

    if (amount > this.cashAvailable) {
      throw new Error("ATM has insufficient cash");
    }

    this.cashAvailable -= amount;
    console.log(`Collect your cash: ₹${amount}`);
  }

  getAvailableCash() {
    return this.cashAvailable;
  }
}

// Every state defines the operations that the ATM supports.
// Concrete states decide what happens for each operation.
class ATMState {
  insertCard() {
    throw new Error("Operation not supported");
  }

  enterPin() {
    throw new Error("Operation not supported");
  }

  checkBalance() {
    throw new Error("Operation not supported");
  }

  withdraw() {
    throw new Error("Operation not supported");
  }

  deposit() {
    throw new Error("Operation not supported");
  }

  ejectCard() {
    throw new Error("Operation not supported");
  }
}

class IdleState extends ATMState {
  constructor(atm) {
    super();
    this.atm = atm;
  }

  insertCard(card) {
    if (!card) {
      throw new Error("Invalid card");
    }

    this.atm.card = card;
    this.atm.account = null;

    this.atm.setState(new CardInsertedState(this.atm));

    console.log("Card inserted. Please enter your PIN.");
  }
}

class CardInsertedState extends ATMState {
  constructor(atm) {
    super();
    this.atm = atm;
  }

  enterPin(pin) {
    const account = this.atm.card.getAccount();

    if (!account.validatePin(pin)) {
      this.atm.failedAttempts++;

      console.log("Incorrect PIN");

      if (this.atm.failedAttempts >= 3) {
        console.log("Too many attempts. Card blocked.");

        this.atm.card = null;
        this.atm.account = null;
        this.atm.failedAttempts = 0;
        this.atm.setState(new IdleState(this.atm));
      }

      return false;
    }

    this.atm.account = account;
    this.atm.failedAttempts = 0;
    this.atm.setState(new AuthenticatedState(this.atm));

    console.log("PIN verified successfully");
    return true;
  }

  ejectCard() {
    this.atm.card = null;
    this.atm.setState(new IdleState(this.atm));

    console.log("Card ejected");
  }
}

class AuthenticatedState extends ATMState {
  constructor(atm) {
    super();
    this.atm = atm;
  }

  checkBalance() {
    const balance = this.atm.account.checkBalance();

    console.log(`Account balance: ₹${balance}`);
    return balance;
  }

  withdraw(amount) {
    const account = this.atm.account;

    // Check ATM cash before changing the account balance.
    if (amount > this.atm.cashDispenser.getAvailableCash()) {
      throw new Error("ATM has insufficient cash");
    }

    // Validate the amount and account balance first.
    if (amount <= 0 || amount % 100 !== 0) {
      throw new Error("Invalid withdrawal amount");
    }

    if (amount > account.checkBalance()) {
      throw new Error("Insufficient account balance");
    }

    // Both operations are safe after the checks above
    // in this simple, single-process example.
    account.withdraw(amount);
    this.atm.cashDispenser.dispense(amount);

    console.log("Withdrawal successful");
  }

  deposit(amount) {
    this.atm.account.deposit(amount);
    console.log(`Deposited ₹${amount}`);
  }

  ejectCard() {
    this.atm.card = null;
    this.atm.account = null;
    this.atm.setState(new IdleState(this.atm));

    console.log("Card ejected. Thank you!");
  }
}

class ATM {
  constructor(initialCash) {
    this.cashDispenser = new CashDispenser(initialCash);

    this.card = null;
    this.account = null;
    this.failedAttempts = 0;

    this.setState(new IdleState(this));
  }

  setState(state) {
    this.state = state;
  }

  insertCard(card) {
    return this.state.insertCard(card);
  }

  enterPin(pin) {
    return this.state.enterPin(pin);
  }

  checkBalance() {
    return this.state.checkBalance();
  }

  withdraw(amount) {
    return this.state.withdraw(amount);
  }

  deposit(amount) {
    return this.state.deposit(amount);
  }

  ejectCard() {
    return this.state.ejectCard();
  }
}

// ---------------- DEMO ----------------

const account = new BankAccount("ACC101", "1234", 10000);
const card = new Card(account);
const atm = new ATM(5000);

atm.insertCard(card);
atm.enterPin("1234");

atm.checkBalance();  // ₹10000
atm.withdraw(2000);  // Dispenses ₹2000
atm.deposit(500);    // Deposits ₹500
atm.checkBalance();  // ₹8500
atm.ejectCard();

console.log("ATM cash:", atm.cashDispenser.getAvailableCash());
// ₹3000
