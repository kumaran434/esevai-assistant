import React, { useState, useEffect, createContext, useContext } from 'react';

export type Language = 'en' | 'ta';

interface Translations {
  [key: string]: {
    en: string;
    ta: string;
  };
}

export const translations: Translations = {
  dashboard: { en: 'Dashboard', ta: 'முகப்பு' },
  portals: { en: 'Portals', ta: 'அரசு இணையதளங்கள்' },
  addPortal: { en: 'Add Portal', ta: 'லிங்க் சேர்க்கவும்' },
  portalName: { en: 'Portal Name', ta: 'இணையதளத்தின் பெயர்' },
  portalUrl: { en: 'Portal URL', ta: 'இணையதள முகவரி (Link)' },
  portalDesc: { en: 'Description', ta: 'குறிப்பு' },
  savePortal: { en: 'Save Portal', ta: 'லிங்க் சேமி' },
  deletePortalConfirm: { en: 'Are you sure you want to delete this portal?', ta: 'இந்த லிங்கை நீக்க வேண்டுமா?' },
  myPortals: { en: 'My Portals', ta: 'எனது இணையதளங்கள்' },
  personalPortals: { en: 'Personal Portals', ta: 'எனது சொந்த லிங்குகள்' },
  masterProfiles: { en: 'Master Profiles', ta: 'மாஸ்டர் சுயவிவரங்கள்' },
  smartAutomation: { en: 'Smart Automation', ta: 'ஸ்மார்ட் ஆட்டோமேஷன்' },
  downloadApp: { en: 'Download App', ta: 'ஆப்பை பதிவிறக்கவும்' },
  downloadTitle: { en: 'Get the Desktop Experience', ta: 'டெஸ்க்டாப் ஆப் பதிவிறக்கம்' },
  downloadDesc: { en: 'Experience high-speed document processing and auto-filling with our desktop application.', ta: 'எங்கள் டெஸ்க்டாப் ஆப் மூலம் ஆவணங்களை விரைவாகச் செயலாக்கி, படிவங்களைத் தானாகப் பூர்த்தி செய்யுங்கள்.' },
  installWindows: { en: 'Download for Windows', ta: 'Windows-க்காக பதிவிறக்கவும்' },
  installMac: { en: 'Download for Mac', ta: 'Mac-க்காக பதிவிறக்கவும்' },
  tools: { en: 'Tools', ta: 'கருவிகள்' },
  addCustomer: { en: 'Add Profile', ta: 'புதிய சுயவிவரத்தை சேர்' },
  customerName: { en: 'Name', ta: 'பெயர்' },
  nameTamil: { en: 'Name in Tamil', ta: 'பெயர் (தமிழ்)' },
  dob: { en: 'Date of Birth', ta: 'பிறந்த தேதி' },
  gender: { en: 'Gender', ta: 'பாலினம்' },
  genderTamil: { en: 'Gender in Tamil', ta: 'பாலினம் (தமிழ்)' },
  address: { en: 'Address', ta: 'முகவரி' },
  addressTamil: { en: 'Address in Tamil', ta: 'முகவரி (தமிழ்)' },
  phone: { en: 'Phone', ta: 'தொலைபேசி' },
  email: { en: 'Email', ta: 'மின்னஞ்சல்' },
  familyDetails: { en: 'Family Details', ta: 'குடும்ப விவரங்கள்' },
  motherName: { en: "Mother's Name", ta: 'தாய் பெயர்' },
  motherNameTamil: { en: "Mother's Name (Local)", ta: 'தாய் பெயர் (தமிழ்)' },
  spouseName: { en: 'Spouse Name (Wife/Husband)', ta: 'மனைவி / கணவர் பெயர்' },
  spouseNameTamil: { en: 'Spouse Name (Local)', ta: 'மனைவி / கணவர் (தமிழ்)' },
  fatherName: { en: "Father's Name", ta: 'தந்தை பெயர்' },
  fatherNameTamil: { en: "Father's Name (Local)", ta: 'தந்தை பெயர் (தமிழ்)' },
  
  idDetails: { en: 'Identity Details', ta: 'அடையாள விவரங்கள்' },
  aadhaar: { en: 'Aadhaar Number', ta: 'ஆதார் எண்' },
  pan: { en: 'PAN Number', ta: 'பான் (PAN) எண்' },
  smartCard: { en: 'Smart Ration Card', ta: 'ஸ்மார்ட் ரேஷன் கார்டு' },
  voterId: { en: 'Voter ID', ta: 'வாக்காளர் அடையாள அட்டை' },
  canNumber: { en: 'CAN Number', ta: 'CAN எண்' },
  
  addressDetails: { en: 'Address Details', ta: 'முகவரி விவரங்கள்' },
  doorNo: { en: 'Door No', ta: 'கதவு எண்' },
  streetName: { en: 'Street / Nagar', ta: 'தெரு / நகர்' },
  streetNameTamil: { en: 'Street Name (Local)', ta: 'தெருப் பெயர் (தமிழ்)' },
  village: { en: 'Village / Area', ta: 'கிராமம் / பகுதி' },
  villageTamil: { en: 'Village (Local)', ta: 'கிராமம் (தமிழ்)' },
  taluk: { en: 'Taluk', ta: 'வட்டம் (தாலுகா)' },
  talukTamil: { en: 'Taluk (Local)', ta: 'வட்டம் (தமிழ்)' },
  district: { en: 'District', ta: 'மாவட்டம்' },
  districtTamil: { en: 'District (Local)', ta: 'மாவட்டம் (தமிழ்)' },
  state: { en: 'State', ta: 'மாநிலம்' },
  stateTamil: { en: 'State (Local)', ta: 'மாநிலம் (தமிழ்)' },
  pincode: { en: 'Pincode', ta: 'அஞ்சல் குறியீடு' },
  
  bankDetails: { en: 'Bank Details', ta: 'வங்கி விவரங்கள்' },
  bankName: { en: 'Bank Name', ta: 'வங்கியின் பெயர்' },
  accountNumber: { en: 'Account Number', ta: 'கணக்கு எண்' },
  ifscCode: { en: 'IFSC Code', ta: 'IFSC குறியீடு' },
  
  save: { en: 'Save', ta: 'சேமி' },
  cancel: { en: 'Cancel', ta: 'ரத்து செய்' },
  delete: { en: 'Delete', ta: 'நீக்கு' },
  addField: { en: 'Add New Field', ta: 'புதிய புலத்தைச் சேர்க்கவும்' },
  fieldLabel: { en: 'Field Label', ta: 'புலத்தின் பெயர்' },
  fieldValue: { en: 'Field Value', ta: 'புலத்தின் மதிப்பு' },
  
  // Tools Page
  toolsTitle: { en: 'CSC Document Utilities', ta: 'CSC ஆவணப் பயன்பாடுகள்' },
  toolsSubTitle: { en: 'Optimized for Government Portals', ta: 'அரசு இணையதளங்களுக்காக உருவாக்கப்பட்டது' },
  idCardTool: { en: 'ID Merger', ta: 'ஐடி மெர்ஜர் (ID Merger)' },
  idCardDesc: { en: 'Front & Back Side-by-Side Image Merger', ta: 'முன்பக்கம் மற்றும் பின்பக்கம் இணைக்க' },
  photoOptimizer: { en: 'Photo Optimizer', ta: 'புகைப்பட மேம்படுத்தி' },
  photoOptimizerDesc: { en: 'Resize & Compress for Portals', ta: 'இணையதளங்களுக்காக அளவு மாற்றம் & சுருக்குதல்' },
  signGenerator: { en: 'Sign Generator', ta: 'கையெழுத்து உருவாக்கி' },
  signGeneratorDesc: { en: 'Optimized Digital Signatures', ta: 'மேம்படுத்தப்பட்ட டிஜிட்டல் கையொப்பங்கள்' },
  pdfToImage: { en: 'PDF to Image', ta: 'PDF-யை படமாக மாற்ற' },
  pdfToImageDesc: { en: 'Extract Pages as Web-Ready JPG', ta: 'பக்கங்களை JPG படமாக எடுக்க' },
  pdfCompressor: { en: 'PDF Compressor', ta: 'PDF அளவு குறைப்பான்' },
  pdfCompressorDesc: { en: 'Shrink PDF for limit-bound sites', ta: 'PDF அளவைச் சுருக்க' },
  dataExtraction: { en: 'Data Extraction', ta: 'தகவல் பிரித்தெடுத்தல்' },
  dataExtractionDesc: { en: 'AI Document Data Extractor', ta: 'AI ஆவணத் தகவல் எடுப்பான்' },
  wordEditor: { en: 'Word Editor', ta: 'ஆவணத் திருத்தி (Word Editor)' },
  wordEditorDesc: { en: 'Create & Edit Deeds & Agreements', ta: 'பத்திரம், ஒப்பந்தங்கள், படிவங்களை உருவாக்க' },
  openTool: { en: 'Open Tool', ta: 'கருவியைத் திற' },
  backToTools: { en: 'Back to Tools', ta: 'கருவிகள் பக்கத்திற்குத் திரும்பவும்' },
  
  // Desktop Automation Guide
  automationStep1: { en: 'Select a Master Profile before opening a portal.', ta: 'போர்டலைத் திறப்பதற்கு முன் ஒரு மாஸ்டர் சுயவிவரத்தைத் தேர்ந்தெடுக்கவும்.' },
  automationStep2: { en: 'Click the open portal button in the government websites section.', ta: 'அரசு இணையதளங்கள் பகுதியில் உள்ள லிங்க் பட்டனை கிளிக் செய்யவும்.' },
  automationStep3: { en: 'The Desktop App will automatically fill the form fields.', ta: 'படிவம் வந்துவிட்டால் AI உதவியாளர் தானாகவே உங்களுக்குத் தேவையான விவரங்களை நிரப்பும்.' },
  automationStep4: { en: 'Submit the form and proceed with the application.', ta: 'படிவத்தைச் சமர்ப்பித்து விண்ணப்பத்தைத் தொடரவும்.' },
  automationDesc: { en: 'Our Desktop Automation helps you auto-fill forms instantly from your master profiles.', ta: 'எங்கள் டெஸ்க்டாப் ஆட்டோமேஷன் உங்கள் மாஸ்டர் சுயவிவரங்களிலிருந்து படிவங்களை உடனடியாகத் தானாக நிரப்ப உதவுகிறது.' },
  
  male: { en: 'Male', ta: 'ஆண்' },
  female: { en: 'Female', ta: 'பெண்' },
  other: { en: 'Other', ta: 'மற்றவை' },
  searchProfiles: { en: 'Search Profiles...', ta: 'சுயவிவரங்களைத் தேடு...' },
  
  // ID Card Tool Specifics
  frontSide: { en: 'Front Side (e.g. Aadhar)', ta: 'முன்பக்கம் (எ.கா. ஆதார்)' },
  backSide: { en: 'Back Side (e.g. Address)', ta: 'பின்பக்கம் (எ.கா. முகவரி)' },
  uploadFront: { en: 'Upload Front', ta: 'முன்பக்கத்தைப் பதிவேற்றவும்' },
  uploadBack: { en: 'Upload Back', ta: 'பின்பக்கத்தைப் பதிவேற்றவும்' },
  cropIdImage: { en: 'Crop ID Image', ta: 'படத்தைச் செதுக்கவும் (Crop)' },
  cropInstruction: { en: 'Select valid area for portal upload', ta: 'பதிவேற்றத் தேவையான பகுதியைத் தேர்ந்தெடுக்கவும்' },
  govIdSize: { en: 'Gov ID Size', ta: 'அரசு ID அளவு' },
  freeSelection: { en: 'Free Selection', ta: 'சாதாரணத் தேர்வு' },
  applySave: { en: 'Apply & Save', ta: 'பயன்படுத்திச் சேமிக்கவும்' },
  outputSettings: { en: 'Output Settings (Government Portal Ready)', ta: 'வெளியீட்டு அமைப்புகள்' },
  targetSize: { en: 'Target Size', ta: 'இலக்கு அளவு' },
  downloadFront: { en: 'Download Front JPG', ta: 'முன்பக்கத்தைப் பதிவிறக்கவும்' },
  downloadBack: { en: 'Download Back JPG', ta: 'பின்பக்கத்தைப் பதிவிறக்கவும்' },
  downloadMerged: { en: 'Download Merged (Front + Back)', ta: 'முன்பக்கம் + பின்பக்கம் சேர்த்துப் பதிவிறக்கவும்' },
  optimizing: { en: 'Optimizing...', ta: 'மேம்படுத்தப்படுகிறது...' },
  govGuidelinesTitle: { en: 'Government Portal Guidelines', ta: 'அரசு இணையதள வழிகாட்டுதல்கள்' },
  govGuidelinesDesc: { en: 'Most portals (TNPDS, PATTA, CSC) require JPG images under 200KB or 500KB. Our tool hits your target size exactly while maintaining clarity.', ta: 'பெரும்பாலான இணையதளங்கள் (TNPDS, PATTA, CSC) 200KB அல்லது 500KB-க்கு குறைவான படங்களையே கேட்கும். எமது கருவி தெளிவு குறையாமல் சரியான அளவில் மாற்றித் தரும்.' },
  
  // PDF Compressor Specifics
  simpleCompress: { en: 'Simple Compress', ta: 'சாதாரணச் சுருக்குதல்' },
  splitCompress: { en: 'Split & Compress', ta: 'பிரித்துச் சுருக்குதல்' },
  uploadPdf: { en: 'Upload PDF', ta: 'PDF-யை பதிவேற்றவும்' },
  scanProof: { en: 'Scan or proof document', ta: 'ஸ்கேன் செய்யப்பட்ட ஆவணம்' },
  remove: { en: 'Remove', ta: 'நீக்கு' },
  pagesPerFile: { en: 'Pages Per File', ta: 'ஒரு கோப்பிற்கான பக்கங்கள்' },
  splitInstruction: { en: 'Split every N pages', ta: 'ஒவ்வொரு N பக்கங்களாகப் பிரி' },
  compressDownload: { en: 'Compress & Download', ta: 'சுருக்கிப் பதிவிறக்கவும்' },
  splitCompressAction: { en: 'Split & Compress', ta: 'பிரித்துச் சுருக்குதல்' },
  initializing: { en: 'Initializing...', ta: 'தயாராகிறது...' },
  processingEntirePdf: { en: 'Compressing entire PDF...', ta: 'PDF சுருக்கப்படுகிறது...' },
  creatingZip: { en: 'Creating ZIP...', ta: 'ZIP கோப்பு உருவாக்கப்படுகிறது...' },
  complete: { en: 'Complete!', ta: 'முடிந்தது!' },
  errorPdf: { en: 'Error: Failed to process PDF', ta: 'பிழை: PDF-யைச் செயல்படுத்த முடியவில்லை' },
  splitGuideline: { en: 'Split mode will generate multiple compressed PDFs and bundle them into a ZIP file for easy downloading.', ta: 'பிரிக்கும் முறை பல சிறிய PDF-களை உருவாக்கி அவற்றை ஒரே ZIP கோப்பாகத் தரும்.' },

  // Sign Generator Specifics
  drawSignature: { en: 'Draw your signature', ta: 'கையெழுத்தை வரையவும்' },
  usePen: { en: 'Use your mouse or touch screen', ta: 'மவுஸ் அல்லது டச் ஸ்கிரீன் மூலம் வரையவும்' },
  clear: { en: 'Clear', ta: 'அழி' },
  optimizedSign: { en: 'Optimized Signature (Transparent)', ta: 'மேம்படுத்தப்பட்ட கையொப்பம்' },
  downloadSign: { en: 'Download Signature JPG', ta: 'கையெழுத்தைப் பதிவிறக்கவும்' },
  signGuideline: { en: 'Our tool ensures your signature is optimized for TNEB or other service portal uploads.', ta: 'TNEB அல்லது பிற அரசு இணையதளங்களுக்காக உங்கள் கையொப்பம் சரியாக மாற்றப்படும்.' },
  inkColor: { en: 'Ink Color', ta: 'மையின் நிறம்' },
  maxFileSize: { en: 'Max File Size', ta: 'அதிகபட்ச கோப்பு அளவு' },
  downloadStandalone: { en: 'Download Standalone Sign', ta: 'கையெழுத்தை மட்டும் பதிவிறக்கவும்' },
  uploadForm: { en: 'Upload Form (PDF or Image)', ta: 'படிவத்தைப் பதிவேற்றவும் (PDF அல்லது படம்)' },
  
  // Passport Resizer
  passportResizer: { en: 'Passport Resize', ta: 'பாஸ்போர்ட் அளவு மாற்றம்' },
  passportResizerDesc: { en: 'Crop & Resize for Passport Photos', ta: 'பாஸ்போர்ட் புகைப்படத்திற்காக செதுக்க மற்றும் அளவு மாற்ற' },
  passportSettings: { en: 'Passport Settings', ta: 'பாஸ்போர்ட் அமைப்புகள்' },
  uploadPhoto: { en: 'Upload Photo', ta: 'புகைப்படத்தைப் பதிவேற்றவும்' },
  downloadPassport: { en: 'Download Passport JPG', ta: 'பாஸ்போர்ட் புகைப்படத்தைப் பதிவிறக்கவும்' },
  cropAndResize: { en: 'Apply & Optimize', ta: 'பயன்படுத்தி மேம்படுத்தவும்' },
  targetFileSize: { en: 'Target File Size', ta: 'இலக்கு கோப்பு அளவு' },
  passportGuideline: { en: 'Most government portals require passport photos to be exactly 3.5cm x 4.5cm and under 200KB. This tool handles everything automatically.', ta: 'பெரும்பாலான அரசு இணையதளங்கள் பாஸ்போர்ட் போட்டோக்கள் 3.5cm x 4.5cm அளவிலும், 200KB-க்கு குறைவாகவும் இருக்க வேண்டும் என கேட்கும். இந்த கருவி அதை தானாகவே செய்யும்.' },
  awaitingCrop: { en: 'Adjust and Apply', ta: 'சரிசெய்து பயன்படுத்தவும்' },
  editAgain: { en: 'Back to Edit', ta: 'மீண்டும் திருத்த' },
  
  placeSignInstruction: { en: 'Place signature on this document', ta: 'இந்த ஆவணத்தில் கையொப்பத்தை இடவும்' },
  docReady: { en: 'Document Ready', ta: 'ஆவணம் தயார்' },
  changeFile: { en: 'Change File', ta: 'கோப்பை மாற்றவும்' },
  applyPreparedSign: { en: 'Apply Prepared Signature', ta: 'தயார் செய்த கையொப்பத்தைப் பயன்படுத்தவும்' },
  downloadSignedForm: { en: 'Download Signed Form', ta: 'கையொப்பமிட்ட படிவத்தைப் பதிவிறக்கவும்' },
  mergingOptimizing: { en: 'Merging & Optimizing...', ta: 'இணைக்கப்பட்டு மேம்படுத்தப்படுகிறது...' },
  drawHere: { en: 'Draw Signature Here', ta: 'இங்கே கையொப்பத்தை வரையவும்' },
  enterFullName: { en: 'Enter Full Name', ta: 'முழுப் பெயரை உள்ளிடவும்' },
  signatureStyle: { en: 'Signature Style', ta: 'கையெழுத்து நடை' },
  style: { en: 'Style', ta: 'நடை' },
  drawSign: { en: 'Draw Sign', ta: 'வரைய' },
  typeSign: { en: 'Type Sign', ta: 'டைப் செய்ய' },
  signForm: { en: 'Sign Form', ta: 'படிவத்தில் கையொப்பமிட' },
  govPortalReady: { en: 'Government Portal Ready', ta: 'அரசு இணையதளங்களுக்கு ஏற்றது' },
  signPortalGuideline: { en: 'You can now upload PDF forms, place your signature, and download as an optimized image for government portals.', ta: 'PDF படிவங்களைப் பதிவேற்றி, அதில் உங்கள் கையொப்பத்தை வைத்து, அரசு இணையதளங்களுக்காக மேம்படுத்தப்பட்ட படமாக பதிவிறக்கம் செய்யலாம்.' },

  // Image to PDF / Photo Optimizer Specifics
  photoOptimizerTitle: { en: 'Photo Optimizer & PDF', ta: 'புகைப்பட மேம்படுத்தி & PDF' },
  aspectRatio: { en: 'Aspect Ratio', ta: 'விகிதம் (Ratio)' },
  passportSize: { en: 'Passport Size', ta: 'பாஸ்போர்ட் அளவு' },
  standard46: { en: 'Standard 4x6', ta: 'சாதாரண 4x6' },
  addPhotosDocs: { en: 'Add Photos/Documents', ta: 'புகைப்படங்கள்/ஆவணங்களைச் சேர்க்கவும்' },
  supportedFormats: { en: 'JPG, PNG, WebP supported', ta: 'JPG, PNG, WebP ஆதரிக்கப்படுகிறது' },
  downloadOptimizedJpks: { en: 'Download Optimized JPGs', ta: 'மேம்படுத்தப்பட்ட JPG-களைப் பதிவிறக்கவும்' },
  imageToPdf: { en: 'Image to PDF', ta: 'புகைப்படத்தை PDF-ஆக மாற்ற' },
  imageToPdfDesc: { en: 'Convert multiple photos into a single PDF', ta: 'பல போட்டோக்களை ஒரே PDF கோப்பாக மாற்ற' },
  mergePdf: { en: 'Merge PDF', ta: 'PDF கோப்புகளை இணைக்க' },
  mergePdfDesc: { en: 'Combine multiple PDF files into one', ta: 'ஒன்றுக்கும் மேற்பட்ட PDF-களை ஒன்றாக இணைக்க' },
  addPdfFiles: { en: 'Add PDF Files', ta: 'PDF கோப்புகளைச் சேர்க்கவும்' },
  selectMultiplePdf: { en: 'Select 2 or more PDF files', ta: '2 அல்லது அதற்கு மேற்பட்ட கோப்புகளைத் தேர்ந்தெடுக்கவும்' },
  mergeAndDownload: { en: 'Merge and Download', ta: 'இணைத்து பதிவிறக்கவும்' },
  mergePdfNotice: { en: 'Merging multiple certificates or documents into one PDF is common for online applications.', ta: 'அரசு இணையதளங்களில் பதிவேற்ற பல சான்றிதழ்களை ஒரே PDF-ஆக இணைப்பது அவசியம்.' },
  combineToPdf: { en: 'Combine to PDF', ta: 'PDF-ஆக மாற்றவும்' },
  combineToPdfDesc: { en: 'Combine multiple photos into one PDF file', ta: 'பல புகைப்படங்களை ஒரே PDF-ஆக மாற்ற' },
  item: { en: 'Item', ta: 'உருப்படி' },
  readyForOptimization: { en: 'Ready for optimization', ta: 'மேம்படுத்தத் தயார்' },
  dragToReorder: { en: 'Drag items to reorder before combining', ta: 'வரிசையை மாற்ற இங்கே இழுக்கவும் (Drag)' },
  convertPdfToJpg: { en: 'Convert PDF to JPG', ta: 'PDF-யை JPG-ஆக மாற்ற' },
  extractPages: { en: 'Extract all pages', ta: 'அனைத்துப் பக்கங்களையும் பிரி' },
  startExtraction: { en: 'Start Extraction', ta: 'பிரிக்கத் தொடங்கவும்' },
  readyToExtract: { en: 'Ready to Extract', ta: 'பிரிக்கத் தயார்' },
  optimizedPortalUpload: { en: 'Optimized for quick portal uploads', ta: 'இணையதளப் பதிவேற்றத்திற்காக மேம்படுத்தப்பட்டது' },
  
  // Automation Specifics
  sourceCodeReady: { en: 'The source code for your automation is generated and ready in the project directory.', ta: 'உங்கள் ஆட்டோமேஷனுக்கான நிரல் குறியீடு தயாராக உள்ளது.' },
  downloadZip: { en: 'Download App Update', ta: 'ஆப் அப்டேட் பதிவிறக்கவும்' },
  oneIdentity: { en: 'One identity.', ta: 'ஒரே ஒரு அடையாளம்.' },
  everyPortal: { en: 'Every portal.', ta: 'அனைத்து இணையதளங்களும்.' },
  bridgeDesc: { en: 'The automation tool connects your Master Database to any government portal.', ta: 'இந்த ஆப் உங்கள் மாஸ்டர் தரவுதளத்தை அரசு இணையதளங்களுடன் இணைக்கிறது.' },
  automationUi: { en: 'Bot', ta: 'ஸ்மார்ட் பாட்' },
  directAiUpload: { en: 'Direct AI Upload', ta: 'நேரடி AI பதிவேற்றம்' },
  
  // Dashboard Specifics
  recent: { en: 'Recent', ta: 'சமீபத்திய' },
  automatedDatabase: { en: 'Automated Database', ta: 'தானியங்கி தரவுதளம்' },
  searchDatabase: { en: 'Search database...', ta: 'தேடு...' },
  idNumber: { en: 'ID Number', ta: 'அடையாள எண் (ID)' },
  aiExtraction: { en: 'AI Extraction', ta: 'AI பிரித்தெடுத்தல்' },
  synced: { en: 'Synced', ta: 'இணைக்கப்பட்டது' },
  verified: { en: 'Verified', ta: 'சரிபார்க்கப்பட்டது' },
  noProfilesFound: { en: 'No profiles found. Create your first Master Profile to start automation.', ta: 'தகவல்கள் எதுவும் இல்லை. முதலில் ஒரு சுயவிவரத்தை உருவாக்கவும்.' },
  viewFullDatabase: { en: 'View full database', ta: 'முழு தரவுதளத்தைப் பார்க்க' },
  aiDocProcess: { en: 'AI Document Process', ta: 'AI ஆவணச் செயல்முறை' },
  openScanner: { en: 'Open Scanner', ta: 'ஸ்கேனரைத் திற' },
  automationSyncLabel: { en: 'Automation Sync', ta: 'ஆட்டோமேஷன் சிங்க்' },
  status: { en: 'Status', ta: 'நிலை' },
  online: { en: 'Online', ta: 'ஆன்லைனில் உள்ளது' },
  terminals: { en: 'Terminals', ta: 'முனையங்கள்' },
  active: { en: 'Active', ta: 'செயலில் உள்ளது' },
  cloudSync: { en: 'Cloud Sync', ta: 'கிளவுட் ஒத்திசைவு' },
  deleteModalMsg: { en: 'Are you sure you want to delete this profile? This action cannot be undone and will remove all master data from the database.', ta: 'இந்தத் தகவலை நீக்க வேண்டுமா? இதை மாற்ற முடியாது.' },
  aiVerification: { en: 'AI Verification', ta: 'AI சரிபார்ப்பு' },
  sendToApp: { en: 'Select Profile', ta: 'புரொஃபைல் தேர்வு' },
  editProfile: { en: 'Edit Profile', ta: 'சுயவிவரம் திருத்து' },
  noCustomersSyncing: { en: 'No Customers Syncing', ta: 'சுயவிவரங்கள் எதுவும் இல்லை' },
  connectFirebaseMsg: { en: 'Connect your Firebase database to begin automating master profiles.', ta: 'மாஸ்டர் சுயவிவரங்களை உருவாக்க உங்கள் தரவுதளத்தை இணைக்கவும்.' },
  discardChanges: { en: 'Discard Changes?', ta: 'மாற்றங்களை ரத்து செய்யவா?' },
  discardMsg: { en: 'Are you sure you want to discard your changes? All unsaved data will be lost.', ta: 'நீங்கள் செய்த மாற்றங்களை ரத்து செய்ய விரும்புகிறீர்களா? சேமிக்கப்படாத தகவல்கள் அழிந்துவிடும்.' },
  discard: { en: 'Discard', ta: 'ரத்து செய்' },
  updateMasterProfile: { en: 'Update Master Profile', ta: 'சுயவிவரத்தைப் புதுப்பிக்கவும்' },
  createMasterProfile: { en: 'Create Master Profile', ta: 'சுயவிவரத்தை உருவாக்கவும்' },
  aiMultiScan: { en: 'AI Multi-Scan (2-5 Docs)', ta: 'AI ஸ்கேன் (2-5 ஆவணங்கள்)' },
  targetDocSize: { en: 'Target Doc Size (KB)', ta: 'கோப்பு அளவு (KB)' },
  addDocument: { en: 'Add Document', ta: 'ஆவணத்தைச் சேர்க்க' },
  scanAndCompress: { en: 'Scan & Compress', ta: 'ஸ்கேன் & சுருக்கு' },
  aiDeepScanning: { en: 'AI Deep Scanning...', ta: 'AI தீவிரமாகத் தேடுகிறது...' },
  profilesMerged: { en: 'Profiles Merged!', ta: 'சுயவிவரங்கள் இணைக்கப்பட்டன!' },
  extractionError: { en: 'Extraction Error', ta: 'தகவல் எடுப்பதில் சிக்கல்' },
  currentArtifacts: { en: 'Current Artifacts', ta: 'தற்போதைய ஆவணங்கள்' },
  smartCardId: { en: 'e.g. Smart Card ID', ta: 'உதாரணம்: ஸ்மார்ட் கார்டு எண்' },
  updateProfile: { en: 'Update Profile', ta: 'சுயவிவரத்தைப் புதுப்பி' },
  saveProfile: { en: 'Save Profile', ta: 'சுயவிவரத்தைச் சேமி' },
  translator: { en: 'Language Bridge', ta: 'மொழிப் பாலம்' },
  translatorDesc: { en: 'Translate to Local Language', ta: 'உள்ளூர் மொழிக்கு மொழிபெயர்க்க' },
  translate: { en: 'Translate', ta: 'மொழிபெயர்க்க' },
  translating: { en: 'Translating...', ta: 'மொழிபெயர்க்கப்படுகிறது...' },
  saving: { en: 'Saving...', ta: 'சேமிக்கப்படுகிறது...' },
  enterText: { en: 'Enter text to translate', ta: 'மொழிபெயர்க்க வேண்டிய உரையை உள்ளிடவும்' },
  targetLanguage: { en: 'Target Language', ta: 'இலக்கு மொழி' },
  swapLanguages: { en: 'Swap Languages', ta: 'மொழிகளை மாற்றவும்' },
  sourceLanguage: { en: 'Source Language', ta: 'மூல மொழி' },
  translationResult: { en: 'Translation Result', ta: 'மொழிபெயர்ப்பு முடிவு' },
  subscriptionPlan: { en: 'Subscription Plan', ta: 'சந்தா திட்டம்' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const getStateLanguage = (state: string): Language => {
  const stateMap: { [key: string]: Language } = {
    'Tamil Nadu': 'ta',
    'Puducherry': 'ta',
    'Kerala': 'en', // Could add 'ml' later if supported
    'Karnataka': 'en', // 'kn'
    'Andhra Pradesh': 'en', // 'te'
    'Telangana': 'en' // 'te'
  };
  return stateMap[state] || 'ta';
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
