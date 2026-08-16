/** Source of an uploaded research document. */
export type ResearchDocumentSource = 'Ord Minnett' | 'Barrenjoey' | 'Other';

/** Category of an uploaded research document. */
export type ResearchDocumentType =
  | 'Top Ideas'
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
  /** This source's rating for the security (e.g. "Buy") - only meaningful for Ord Minnett/Barrenjoey uploads. */
  houseViewRating: string | null;
  /** For documentType 'Top Ideas': false once a newer upload from the same source has superseded it. Always true for other document types. */
  isCurrent: boolean;
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
  houseViewRating?: string;
  file: File;
};
