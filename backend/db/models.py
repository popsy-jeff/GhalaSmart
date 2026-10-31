from sqlalchemy import (
    Column, Integer, String, Date, DECIMAL, Enum, TIMESTAMP, Text,
    ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    national_id = Column(String(20), nullable=True)
    county = Column(String(50), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum("FARMER", "OPERATOR"), default="FARMER", nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    deposits = relationship("Deposit", back_populates="farmer", cascade="all, delete-orphan")
    notifications = relationship("SmsNotification", back_populates="farmer", cascade="all, delete-orphan")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    county = Column(String(50), nullable=False)
    date = Column(Date, nullable=False)
    wholesale_price = Column(DECIMAL(10, 4), nullable=False)
    source = Column(Enum("KAMIS", "AGRIBORA"), nullable=False)
    week_of_year = Column(Integer)
    year_week = Column(String(10))

    __table_args__ = (
        Index("idx_county_date", "county", "date"),
    )


class Deposit(Base):
    __tablename__ = "deposits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    receipt_number = Column(String(30), unique=True, nullable=False, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    county = Column(String(50), nullable=False)
    quantity_kg = Column(DECIMAL(10, 2), nullable=False)
    grade = Column(Enum("Grade 1", "Grade 2", "Grade 3"), nullable=False)
    deposit_date = Column(Date, nullable=False)
    status = Column(Enum("STORED", "SOLD", "EXPIRED"), default="STORED")
    current_price_per_kg = Column(DECIMAL(10, 4))
    forecasted_price_per_kg = Column(DECIMAL(10, 4))
    recommended_weeks = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    farmer = relationship("Farmer", back_populates="deposits")
    loan = relationship("Loan", back_populates="deposit", uselist=False, cascade="all, delete-orphan")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), unique=True, nullable=False)
    principal_amount = Column(DECIMAL(12, 2), nullable=False)
    interest_rate = Column(DECIMAL(5, 4), default=0.02)
    accrued_interest = Column(DECIMAL(12, 2), default=0.00)
    storage_fees = Column(DECIMAL(12, 2), default=0.00)
    disbursement_date = Column(Date, nullable=False)
    status = Column(Enum("ACTIVE", "SETTLED", "DEFAULTED"), default="ACTIVE")

    deposit = relationship("Deposit", back_populates="loan")
    transactions = relationship("Transaction", back_populates="loan", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False)
    amount = Column(DECIMAL(12, 2), nullable=False)
    type = Column(
        Enum("ADVANCE_DISBURSEMENT", "FINAL_SETTLEMENT", "STORAGE_FEE", "INTEREST_ACCRUAL", "STK_REPAYMENT"),
        nullable=False
    )
    description = Column(Text)
    mpesa_receipt = Column(String(30))
    phone_number = Column(String(20), nullable=True)
    status = Column(Enum("COMPLETED", "PENDING", "FAILED"), default="COMPLETED", nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    loan = relationship("Loan", back_populates="transactions")


class SmsNotification(Base):
    __tablename__ = "sms_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False)
    phone_number = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    event_type = Column(
        Enum("WELCOME", "WAREHOUSE_RECEIPT", "ADVANCE_DISBURSED", "SETTLEMENT_PAID", "PRICE_ALERT"),
        nullable=False
    )
    status = Column(Enum("DELIVERED", "SENT", "FAILED"), default="DELIVERED", nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    farmer = relationship("Farmer", back_populates="notifications")
