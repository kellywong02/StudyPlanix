export type GradePoint = { grade: string; points: number }

export type GradingScale = {
  id: string
  label: string
  country: string
  maxPoints: number
  grades: GradePoint[]
}

// grade -> points tables, shared across the institutions that use them.
// Sourced from published institution grading policies.
const usStandardGrades: GradePoint[] = [
  { grade: "A+", points: 4.0 },
  { grade: "A", points: 4.0 },
  { grade: "A-", points: 3.7 },
  { grade: "B+", points: 3.3 },
  { grade: "B", points: 3.0 },
  { grade: "B-", points: 2.7 },
  { grade: "C+", points: 2.3 },
  { grade: "C", points: 2.0 },
  { grade: "C-", points: 1.7 },
  { grade: "D+", points: 1.3 },
  { grade: "D", points: 1.0 },
  { grade: "D-", points: 0.7 },
  { grade: "F", points: 0.0 },
]

const sgUniversityGrades: GradePoint[] = [
  { grade: "A+", points: 5.0 },
  { grade: "A", points: 5.0 },
  { grade: "A-", points: 4.5 },
  { grade: "B+", points: 4.0 },
  { grade: "B", points: 3.5 },
  { grade: "B-", points: 3.0 },
  { grade: "C+", points: 2.5 },
  { grade: "C", points: 2.0 },
  { grade: "D+", points: 1.5 },
  { grade: "D", points: 1.0 },
  { grade: "F", points: 0.0 },
]

const smuGrades: GradePoint[] = [
  { grade: "A+", points: 4.0 },
  { grade: "A", points: 4.0 },
  { grade: "A-", points: 3.7 },
  { grade: "B+", points: 3.3 },
  { grade: "B", points: 3.0 },
  { grade: "B-", points: 2.7 },
  { grade: "C+", points: 2.3 },
  { grade: "C", points: 2.0 },
  { grade: "C-", points: 1.7 },
  { grade: "D+", points: 1.3 },
  { grade: "D", points: 1.0 },
  { grade: "F", points: 0.0 },
]

const sgPolyGrades: GradePoint[] = [
  { grade: "A", points: 4.0 },
  { grade: "B+", points: 3.5 },
  { grade: "B", points: 3.0 },
  { grade: "C+", points: 2.5 },
  { grade: "C", points: 2.0 },
  { grade: "D+", points: 1.5 },
  { grade: "D", points: 1.0 },
  { grade: "F", points: 0.0 },
]

const umGrades: GradePoint[] = [
  { grade: "A+", points: 4.0 },
  { grade: "A", points: 4.0 },
  { grade: "A-", points: 3.67 },
  { grade: "B+", points: 3.33 },
  { grade: "B", points: 3.0 },
  { grade: "B-", points: 2.67 },
  { grade: "C+", points: 2.33 },
  { grade: "C", points: 2.0 },
  { grade: "C-", points: 1.67 },
  { grade: "D+", points: 1.33 },
  { grade: "D", points: 1.0 },
  { grade: "E", points: 0.0 },
]

const ukmGrades: GradePoint[] = [
  { grade: "A", points: 4.0 },
  { grade: "A-", points: 3.67 },
  { grade: "B+", points: 3.33 },
  { grade: "B", points: 3.0 },
  { grade: "B-", points: 2.67 },
  { grade: "C+", points: 2.33 },
  { grade: "C", points: 2.0 },
  { grade: "D", points: 1.0 },
  { grade: "E", points: 0.0 },
]

const usmGrades: GradePoint[] = [
  { grade: "A", points: 4.0 },
  { grade: "A-", points: 3.67 },
  { grade: "B+", points: 3.33 },
  { grade: "B", points: 3.0 },
  { grade: "B-", points: 2.67 },
  { grade: "C+", points: 2.33 },
  { grade: "C", points: 2.0 },
  { grade: "C-", points: 1.67 },
  { grade: "D+", points: 1.33 },
  { grade: "D", points: 1.0 },
  { grade: "D-", points: 0.67 },
  { grade: "E", points: 0.0 },
]

const utmGrades: GradePoint[] = [
  { grade: "A+", points: 4.0 },
  { grade: "A", points: 4.0 },
  { grade: "A-", points: 3.67 },
  { grade: "B+", points: 3.33 },
  { grade: "B", points: 3.0 },
  { grade: "B-", points: 2.67 },
  { grade: "C+", points: 2.33 },
  { grade: "C", points: 2.0 },
  { grade: "C-", points: 1.67 },
  { grade: "D+", points: 1.33 },
  { grade: "D", points: 1.0 },
  { grade: "E", points: 0.0 },
]

const upmGrades: GradePoint[] = [
  { grade: "A", points: 4.0 },
  { grade: "A-", points: 3.75 },
  { grade: "B+", points: 3.5 },
  { grade: "B", points: 3.0 },
  { grade: "B-", points: 2.75 },
  { grade: "C+", points: 2.5 },
  { grade: "C", points: 2.0 },
  { grade: "C-", points: 1.75 },
  { grade: "D+", points: 1.5 },
  { grade: "D", points: 1.0 },
  { grade: "F", points: 0.0 },
]

const indiaCGPAGrades: GradePoint[] = [
  { grade: "O", points: 10.0 },
  { grade: "A+", points: 9.0 },
  { grade: "A", points: 8.0 },
  { grade: "B+", points: 7.0 },
  { grade: "B", points: 6.0 },
  { grade: "C", points: 5.0 },
  { grade: "P", points: 4.0 },
  { grade: "F", points: 0.0 },
]

// each institution's full/short name, country, and which grade table + max
// GPA it uses — mirrors published grading policy per school (max GPA is NOT
// uniformly 4.0: Singapore universities are 5.0, India CGPA is 10.0, etc.)
export const PRESET_GRADING_SCALES: GradingScale[] = [
  { id: "nus", label: "National University of Singapore (NUS)", country: "Singapore", maxPoints: 5.0, grades: sgUniversityGrades },
  { id: "ntu", label: "Nanyang Technological University (NTU)", country: "Singapore", maxPoints: 5.0, grades: sgUniversityGrades },
  { id: "smu", label: "Singapore Management University (SMU)", country: "Singapore", maxPoints: 4.0, grades: smuGrades },
  { id: "suss", label: "Singapore University of Social Sciences (SUSS)", country: "Singapore", maxPoints: 5.0, grades: sgUniversityGrades },
  { id: "sutd", label: "Singapore University of Technology and Design (SUTD)", country: "Singapore", maxPoints: 5.0, grades: sgUniversityGrades },
  { id: "sit", label: "Singapore Institute of Technology (SIT)", country: "Singapore", maxPoints: 5.0, grades: sgUniversityGrades },
  { id: "sp", label: "Singapore Polytechnic (SP)", country: "Singapore", maxPoints: 4.0, grades: sgPolyGrades },
  { id: "np", label: "Ngee Ann Polytechnic (NP)", country: "Singapore", maxPoints: 4.0, grades: sgPolyGrades },
  { id: "tp", label: "Temasek Polytechnic (TP)", country: "Singapore", maxPoints: 4.0, grades: sgPolyGrades },
  { id: "nyp", label: "Nanyang Polytechnic (NYP)", country: "Singapore", maxPoints: 4.0, grades: sgPolyGrades },
  { id: "rp", label: "Republic Polytechnic (RP)", country: "Singapore", maxPoints: 4.0, grades: sgPolyGrades },
  { id: "um", label: "Universiti Malaya (UM)", country: "Malaysia", maxPoints: 4.0, grades: umGrades },
  { id: "ukm", label: "Universiti Kebangsaan Malaysia (UKM)", country: "Malaysia", maxPoints: 4.0, grades: ukmGrades },
  { id: "usm", label: "Universiti Sains Malaysia (USM)", country: "Malaysia", maxPoints: 4.0, grades: usmGrades },
  { id: "utm", label: "Universiti Teknologi Malaysia (UTM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "upm", label: "Universiti Putra Malaysia (UPM)", country: "Malaysia", maxPoints: 4.0, grades: upmGrades },
  { id: "uitm", label: "Universiti Teknologi MARA (UiTM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "iium", label: "International Islamic University Malaysia (IIUM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "uum", label: "Universiti Utara Malaysia (UUM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "ums", label: "Universiti Malaysia Sabah (UMS)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "unimas", label: "Universiti Malaysia Sarawak (UNIMAS)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "upsi", label: "Universiti Pendidikan Sultan Idris (UPSI)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "umt", label: "Universiti Malaysia Terengganu (UMT)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "uthm", label: "Universiti Tun Hussein Onn Malaysia (UTHM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "usim", label: "Universiti Sains Islam Malaysia (USIM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "umpsa", label: "Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "unimap", label: "Universiti Malaysia Perlis (UniMAP)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "utem", label: "Universiti Teknikal Malaysia Melaka (UTeM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "unisza", label: "Universiti Sultan Zainal Abidin (UniSZA)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "umk", label: "Universiti Malaysia Kelantan (UMK)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "upnm", label: "Universiti Pertahanan Nasional Malaysia (UPNM)", country: "Malaysia", maxPoints: 4.0, grades: utmGrades },
  { id: "india-cgpa", label: "India CGPA System", country: "India", maxPoints: 10.0, grades: indiaCGPAGrades },
  { id: "us-standard", label: "US Standard (4.0 scale)", country: "United States", maxPoints: 4.0, grades: usStandardGrades },
]

export const CUSTOM_GRADING_SCALE_ID = "custom"

export function getPresetScale(id: string): GradingScale | undefined {
  return PRESET_GRADING_SCALES.find((s) => s.id === id)
}

export function resolveGradingScale(
  gradingScaleId: string,
  customGradeScale: GradePoint[] | null
): GradingScale {
  if (gradingScaleId === CUSTOM_GRADING_SCALE_ID) {
    return {
      id: CUSTOM_GRADING_SCALE_ID,
      label: "Custom",
      country: "",
      maxPoints: customGradeScale?.length
        ? Math.max(...customGradeScale.map((g) => g.points))
        : 4.0,
      grades: customGradeScale ?? [],
    }
  }
  return getPresetScale(gradingScaleId) ?? PRESET_GRADING_SCALES[PRESET_GRADING_SCALES.length - 1]
}
