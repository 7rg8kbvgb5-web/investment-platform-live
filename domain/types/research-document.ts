/** Source of an uploaded research document. */
export type ResearchDocumentSource = 'Ord Minnett' | 'Barrenjoey' | 'Other';

/** Category of an uploaded research document. */
export type ResearchDocumentType =
  | 'Research Note'
  | 'Sector Report'
  | 'Company Update'
  | 'Model Portfolio Note'
  | 'Other';

/** A research document uploaded to the research library, tagged for retrieval. */
export type ResearchDocument = {
  id: string;
  title: string;
  source: ResearchDocumentSource;
  documentType: ResearchDocumentType;
  tickers: string[];
  sectors: string[];
  summary: string | null;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number | null;
  uploadedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
};

/** Fields required to upload a new research document. */
export type ResearchDocumentUploadInput = {
  title: string;
  source: ResearchDocumentSource;
  documentType: ResearchDocumentType;
  tickers: string[];
  sectors: string[];
  summary?: string;
  publishedAt?: string;
  uploadedBy?: string;
  file: File;
};
