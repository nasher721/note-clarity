/**
 * Parser for splitting a single patient's chart into separate clinical notes
 * by detecting note headers like "Progress Note", "H&P", dates, etc.
 */

export interface ParsedNote {
  id: string;
  noteType: string;
  dateTime?: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

// Common clinical note header patterns
const NOTE_HEADER_PATTERNS = [
  // Date-based headers
  /^(?:(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:\d{2}|\d{4}))/m,
  /^\d{4}-\d{2}-\d{2}/m,
  
  // Note type headers
  /^(?:PROGRESS NOTE|Progress Note)/im,
  /^(?:H&P|H & P|HISTORY AND PHYSICAL|History and Physical)/im,
  /^(?:ADMISSION NOTE|Admission Note)/im,
  /^(?:DISCHARGE SUMMARY|Discharge Summary)/im,
  /^(?:CONSULTATION|Consultation|CONSULT NOTE|Consult Note)/im,
  /^(?:OPERATIVE NOTE|Operative Note|OP NOTE|Op Note)/im,
  /^(?:PROCEDURE NOTE|Procedure Note)/im,
  /^(?:NURSING NOTE|Nursing Note)/im,
  /^(?:TELEPHONE NOTE|Telephone Note|PHONE NOTE|Phone Note)/im,
  /^(?:ADDENDUM|Addendum)/im,
  /^(?:TRANSFER NOTE|Transfer Note)/im,
  /^(?:INTERIM SUMMARY|Interim Summary)/im,
  /^(?:DEATH SUMMARY|Death Summary)/im,
  /^(?:BRIEF OP NOTE|Brief Op Note)/im,
  /^(?:ICU NOTE|ICU Progress Note)/im,
  /^(?:ED NOTE|Emergency Department Note|ER NOTE)/im,
  /^(?:CLINIC NOTE|Clinic Note|OFFICE VISIT|Office Visit)/im,
  /^(?:SOCIAL WORK NOTE|Social Work Note)/im,
  /^(?:PHARMACY NOTE|Pharmacy Note)/im,
  /^(?:DIETITIAN NOTE|Dietitian Note|NUTRITION NOTE)/im,
  /^(?:PT NOTE|Physical Therapy Note|OT NOTE|Occupational Therapy Note)/im,
  /^(?:CASE MANAGEMENT|Case Management Note)/im,
  
  // Author/timestamp patterns
  /^(?:Authored by|Author:|Signed by|Attending:)/im,
  /^(?:Note entered|Entered by|Created by)/im,
  
  // Divider patterns
  /^[-=]{5,}\s*$/m,
  /^\*{5,}\s*$/m,
  /^#{5,}\s*$/m,
];

// Combined regex for detecting note boundaries
const NOTE_BOUNDARY_REGEX = new RegExp(
  `(` +
  // Date patterns
  `(?:^|\\n)(?:(?:0?[1-9]|1[0-2])\\/(?:0?[1-9]|[12]\\d|3[01])\\/(?:\\d{2}|\\d{4}))\\s+(?:\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:AM|PM|am|pm)?)?` +
  `|` +
  // Note type headers (case insensitive)
  `(?:^|\\n)(?:PROGRESS NOTE|H&P|H & P|HISTORY AND PHYSICAL|ADMISSION NOTE|DISCHARGE SUMMARY|CONSULTATION|CONSULT NOTE|OPERATIVE NOTE|OP NOTE|PROCEDURE NOTE|NURSING NOTE|TELEPHONE NOTE|PHONE NOTE|ADDENDUM|TRANSFER NOTE|INTERIM SUMMARY|ICU NOTE|ED NOTE|EMERGENCY DEPARTMENT NOTE|ER NOTE|CLINIC NOTE|OFFICE VISIT|BRIEF OP NOTE)\\s*(?:[-:]|\\n)` +
  `|` +
  // Divider lines
  `(?:^|\\n)[-=*#]{5,}\\s*(?:\\n|$)` +
  `)`,
  'gim'
);

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function extractNoteType(text: string): string {
  const firstLine = text.split('\n')[0].trim().substring(0, 100);
  
  // Try to match specific note types
  const noteTypeMatches = [
    { pattern: /progress note/i, type: 'Progress Note' },
    { pattern: /h\s*&\s*p|history and physical/i, type: 'H&P' },
    { pattern: /admission note/i, type: 'Admission Note' },
    { pattern: /discharge summary/i, type: 'Discharge Summary' },
    { pattern: /consult/i, type: 'Consultation' },
    { pattern: /operative note|op note/i, type: 'Operative Note' },
    { pattern: /procedure note/i, type: 'Procedure Note' },
    { pattern: /nursing note/i, type: 'Nursing Note' },
    { pattern: /telephone|phone note/i, type: 'Phone Note' },
    { pattern: /addendum/i, type: 'Addendum' },
    { pattern: /transfer note/i, type: 'Transfer Note' },
    { pattern: /icu note/i, type: 'ICU Note' },
    { pattern: /ed note|er note|emergency/i, type: 'ED Note' },
    { pattern: /clinic|office visit/i, type: 'Clinic Note' },
  ];
  
  for (const { pattern, type } of noteTypeMatches) {
    if (pattern.test(firstLine)) {
      return type;
    }
  }
  
  // Check for date at start
  const dateMatch = firstLine.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return `Note (${dateMatch[1]})`;
  }
  
  return 'Clinical Note';
}

function extractDateTime(text: string): string | undefined {
  const firstLines = text.split('\n').slice(0, 3).join(' ');
  
  // Match various date/time formats
  const dateTimePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i,
    /(\d{4}-\d{2}-\d{2}T?\s*\d{1,2}:\d{2}(?::\d{2})?)/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  
  for (const pattern of dateTimePatterns) {
    const match = firstLines.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

export function parseChart(fullText: string): ParsedNote[] {
  const notes: ParsedNote[] = [];
  
  // Find all note boundaries
  const matches: { index: number; text: string }[] = [];
  let match;
  
  // Reset regex state
  NOTE_BOUNDARY_REGEX.lastIndex = 0;
  
  while ((match = NOTE_BOUNDARY_REGEX.exec(fullText)) !== null) {
    matches.push({
      index: match.index,
      text: match[0],
    });
  }
  
  // If no boundaries found, treat entire text as one note
  if (matches.length === 0) {
    const trimmed = fullText.trim();
    if (trimmed) {
      return [{
        id: generateId(),
        noteType: extractNoteType(trimmed),
        dateTime: extractDateTime(trimmed),
        text: trimmed,
        startIndex: 0,
        endIndex: fullText.length,
      }];
    }
    return [];
  }
  
  // Handle text before first boundary
  if (matches[0].index > 0) {
    const beforeText = fullText.substring(0, matches[0].index).trim();
    if (beforeText.length > 50) { // Only include if substantial
      notes.push({
        id: generateId(),
        noteType: extractNoteType(beforeText),
        dateTime: extractDateTime(beforeText),
        text: beforeText,
        startIndex: 0,
        endIndex: matches[0].index,
      });
    }
  }
  
  // Process each section between boundaries
  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : fullText.length;
    
    const noteText = fullText.substring(startIndex, endIndex).trim();
    
    // Skip if too short (likely just a divider)
    if (noteText.length < 50) continue;
    
    notes.push({
      id: generateId(),
      noteType: extractNoteType(noteText),
      dateTime: extractDateTime(noteText),
      text: noteText,
      startIndex,
      endIndex,
    });
  }
  
  return notes;
}

export function getChartSummary(notes: ParsedNote[]): {
  noteCount: number;
  noteTypes: Record<string, number>;
  dateRange?: { earliest: string; latest: string };
} {
  const noteTypes: Record<string, number> = {};
  const dates: string[] = [];
  
  for (const note of notes) {
    noteTypes[note.noteType] = (noteTypes[note.noteType] || 0) + 1;
    if (note.dateTime) {
      dates.push(note.dateTime);
    }
  }
  
  return {
    noteCount: notes.length,
    noteTypes,
    dateRange: dates.length >= 2 ? {
      earliest: dates[0],
      latest: dates[dates.length - 1],
    } : undefined,
  };
}
