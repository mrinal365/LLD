
const BORROWING_LIMIT = 3;
const LOAN_DURATION_DAYS = 14;

// Represents a book title and how many physical copies the library owns.
class Book {
  constructor(isbn, title, author, totalCopies = 1) {
    if (totalCopies < 1) {
      throw new Error("A book must have at least one copy.");
    }

    this.isbn = isbn;
    this.title = title;
    this.author = author;
    this.totalCopies = totalCopies;
    this.availableCopies = totalCopies;
  }

  isAvailable() {
    return this.availableCopies > 0;
  }

  borrowCopy() {
    if (!this.isAvailable()) {
      throw new Error(`"${this.title}" is not available.`);
    }

    this.availableCopies--;
  }

  returnCopy() {
    if (this.availableCopies >= this.totalCopies) {
      throw new Error("All copies have already been returned.");
    }

    this.availableCopies++;
  }
}

// Represents a registered library member.
class Member {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.activeLoans = new Set();
  }

  canBorrow() {
    return this.activeLoans.size < BORROWING_LIMIT;
  }

  addLoan(loanId) {
    this.activeLoans.add(loanId);
  }

  removeLoan(loanId) {
    this.activeLoans.delete(loanId);
  }
}

// One Loan represents one borrowing transaction.
class Loan {
  constructor(id, book, member) {
    this.id = id;
    this.book = book;
    this.member = member;

    this.borrowedAt = new Date();

    this.dueDate = new Date(this.borrowedAt);
    this.dueDate.setDate(
      this.dueDate.getDate() + LOAN_DURATION_DAYS
    );

    this.returnedAt = null;
  }

  isActive() {
    return this.returnedAt === null;
  }

  isOverdue() {
    return this.isActive() && new Date() > this.dueDate;
  }

  markReturned() {
    if (!this.isActive()) {
      throw new Error("This loan has already been returned.");
    }

    this.returnedAt = new Date();
  }
}

// Coordinates operations between books, members and loans.
class Library {
  constructor() {
    this.books = new Map();   // ISBN -> Book
    this.members = new Map(); // Member ID -> Member
    this.loans = new Map();   // Loan ID -> Loan

    this.nextLoanId = 1;
  }

  addBook(book) {
    if (this.books.has(book.isbn)) {
      throw new Error("A book with this ISBN already exists.");
    }

    this.books.set(book.isbn, book);
  }

  registerMember(member) {
    if (this.members.has(member.id)) {
      throw new Error("This member is already registered.");
    }

    this.members.set(member.id, member);
  }

  searchBooks(keyword) {
    const query = keyword.toLowerCase();

    return [...this.books.values()].filter((book) =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    );
  }

  borrowBook(memberId, isbn) {
    const member = this.members.get(memberId);
    const book = this.books.get(isbn);

    if (!member) {
      throw new Error("Member not found.");
    }

    if (!book) {
      throw new Error("Book not found.");
    }

    if (!member.canBorrow()) {
      throw new Error("Member has reached the borrowing limit.");
    }

    if (!book.isAvailable()) {
      throw new Error("No copies of this book are available.");
    }

    // Create the loan only after validating the request.
    const loan = new Loan(
      this.nextLoanId++,
      book,
      member
    );

    book.borrowCopy();
    member.addLoan(loan.id);
    this.loans.set(loan.id, loan);

    return loan;
  }

  returnBook(memberId, loanId) {
    const member = this.members.get(memberId);
    const loan = this.loans.get(loanId);

    if (!member) {
      throw new Error("Member not found.");
    }

    if (!loan) {
      throw new Error("Loan not found.");
    }

    if (loan.member.id !== memberId) {
      throw new Error("This book was borrowed by another member.");
    }

    if (!loan.isActive()) {
      throw new Error("This book has already been returned.");
    }

    // Update the loan, member and inventory together.
    loan.markReturned();
    member.removeLoan(loan.id);
    loan.book.returnCopy();

    return loan;
  }

  getMemberLoans(memberId) {
    const member = this.members.get(memberId);

    if (!member) {
      throw new Error("Member not found.");
    }

    return [...member.activeLoans]
      .map((loanId) => this.loans.get(loanId))
      .filter(Boolean);
  }

  getOverdueLoans() {
    return [...this.loans.values()].filter((loan) =>
      loan.isOverdue()
    );
  }
}

// ---------------- DEMO ----------------

const library = new Library();

library.addBook(
  new Book("B101", "Clean Code", "Robert C. Martin", 2)
);

library.addBook(
  new Book("B102", "Design Patterns", "Gang of Four", 1)
);

library.registerMember(new Member("M101", "Rahul"));
library.registerMember(new Member("M102", "Priya"));

// Search by title or author.
console.log(library.searchBooks("clean"));

// Rahul borrows Clean Code.
const loan = library.borrowBook("M101", "B101");

console.log("Loan created:", loan.id);
console.log("Due date:", loan.dueDate);

// Rahul returns the book.
library.returnBook("M101", loan.id);

console.log("Available copies:", 
  library.books.get("B101").availableCopies
);
