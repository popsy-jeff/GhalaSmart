export interface Farmer {
  id: number;
  full_name: string;
  phone_number: string;
  county: string;
  national_id?: string | null;
  role: "FARMER" | "OPERATOR" | string;
  created_at: string;
}

export interface UserRegister {
  full_name: string;
  phone_number: string;
  county: string;
  password: string;
  national_id?: string;
}

export interface UserLogin {
  phone_number: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: Farmer;
}

export interface Deposit {
  id: number;
  receipt_number: string;
  farmer_id: number;
  county: string;
  quantity_kg: number;
  grade: "Grade 1" | "Grade 2" | "Grade 3" | string;
  deposit_date: string;
  status: "STORED" | "SOLD" | "EXPIRED" | string;
  current_price_per_kg?: number;
  forecasted_price_per_kg?: number;
  recommended_weeks?: number;
  created_at: string;
}

export interface DepositCreate {
  farmer_id?: number;
  county: string;
  quantity_kg: number;
  grade: "Grade 1" | "Grade 2" | "Grade 3";
}

export interface ForecastHorizon {
  weeks: number;
  forecasted_price_per_kg: number;
  storage_cost: number;
  interest: number;
  expected_net: number;
  profit_vs_sell_now: number;
}

export interface RecommendRequest {
  county: string;
  quantity_kg: number;
  grade: "Grade 1" | "Grade 2" | "Grade 3";
}

export interface RecommendResponse {
  decision: "Sell Now" | "Store";
  current_price_per_kg: number;
  forecasted_price_per_kg: number;
  recommended_weeks: number;
  storage_cost: number;
  advance_interest: number;
  expected_net_value: number;
  advance_offer: number;
  reasoning: string;
  forecast_breakdown: ForecastHorizon[];
}

export interface AcceptAdvanceRequest {
  phone_number?: string;
}

export interface AcceptAdvanceResponse {
  loan_id: number;
  deposit_id: number;
  principal_amount: number;
  interest_rate: number;
  mpesa_receipt: string;
  message: string;
}

export interface SettleRequest {
  sale_price_per_kg?: number;
}

export interface SettleResponse {
  loan_id: number;
  deposit_id: number;
  gross_sale_value: number;
  principal_deducted: number;
  interest_deducted: number;
  storage_fees_deducted: number;
  net_payout: number;
  mpesa_receipt: string;
  message: string;
}

export interface Loan {
  id: number;
  deposit_id: number;
  principal_amount: number;
  interest_rate: number;
  accrued_interest: number;
  storage_fees: number;
  disbursement_date: string;
  status: "ACTIVE" | "SETTLED" | "DEFAULTED" | string;
}

export interface Transaction {
  id: number;
  loan_id: number;
  amount: number;
  type: string;
  description?: string;
  mpesa_receipt?: string;
  phone_number?: string;
  status: string;
  created_at: string;
}

export interface SmsNotification {
  id: number;
  farmer_id: number;
  phone_number: string;
  message: string;
  event_type: "WELCOME" | "WAREHOUSE_RECEIPT" | "ADVANCE_DISBURSED" | "SETTLEMENT_PAID" | "PRICE_ALERT" | string;
  status: "DELIVERED" | "SENT" | "FAILED" | string;
  created_at: string;
}
