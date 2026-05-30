export interface Document {
  id: string;
  type: 'Aadhar' | 'PAN' | 'Voter' | 'DrivingLicense' | 'Other';
  url: string; // base64 for now
  fileName: string;
  extractedData?: any;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  nameTamil?: string;
  dob: string;
  gender: string;
  genderTamil?: string;
  address: string;
  addressTamil?: string;
  phone: string;
  email: string;
  fatherName?: string;
  fatherNameTamil?: string;
  documents: Document[];
  customFields?: CustomField[];
  createdAt: string;
}

export interface ExtractionResult {
  name?: string;
  nameTamil?: string;
  dob?: string;
  idNumber?: string;
  address?: string;
  addressTamil?: string;
  gender?: string;
  genderTamil?: string;
  fatherName?: string;
  fatherNameTamil?: string;
  customValues?: { [id: string]: string };
}
