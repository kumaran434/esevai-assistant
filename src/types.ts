export interface Document {
  id: string;
  type: string;
  url: string;
  fileName: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface ExtractionResult {
  name?: string;
  nameTamil?: string;
  dob?: string;
  phone?: string;
  email?: string;
  motherName?: string;
  motherNameTamil?: string;
  fatherName?: string;
  fatherNameTamil?: string;
  spouseName?: string;
  spouseNameTamil?: string;
  aadhaar?: string;
  pan?: string;
  smartCard?: string;
  voterId?: string;
  canNumber?: string;
  doorNo?: string;
  streetName?: string;
  streetNameTamil?: string;
  village?: string;
  villageTamil?: string;
  taluk?: string;
  talukTamil?: string;
  district?: string;
  districtTamil?: string;
  state?: string;
  stateTamil?: string;
  pincode?: string;
  [key: string]: any;
}

export interface Customer {
  id?: string;
  name: string;
  nameTamil?: string; 
  dob?: string;
  gender?: string;
  genderTamil?: string;
  phone: string;
  email?: string;
  
  // Family Details
  motherName?: string;
  motherNameTamil?: string;
  fatherName?: string;
  fatherNameTamil?: string;
  spouseName?: string;
  spouseNameTamil?: string;
  
  // IDs
  aadhaar?: string;
  pan?: string;
  smartCard?: string;
  voterId?: string;
  canNumber?: string;
  
  // Address
  doorNo?: string;
  streetName?: string;
  streetNameTamil?: string;
  village?: string;
  villageTamil?: string;
  taluk?: string;
  talukTamil?: string;
  district?: string;
  districtTamil?: string;
  state?: string;
  stateTamil?: string;
  pincode?: string;
  address?: string;
  addressTamil?: string; 
  
  // Bank Details (Common for gov benefits)
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;

  // Artifacts
  documents?: Document[];
  customFields?: CustomField[];

  // Work Tracking
  workPurpose?: string;
  workStatus?: 'Pending' | 'In Progress' | 'Completed';

  // Meta
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  state: string;
  language: string;
}
