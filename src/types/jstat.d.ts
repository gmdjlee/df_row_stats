declare module 'jstat' {
  export interface StudentT {
    cdf(x: number, df: number): number;
  }

  export interface CentralF {
    cdf(x: number, df1: number, df2: number): number;
  }

  export interface JStatStatic {
    studentt: StudentT;
    centralF: CentralF;
  }

  const jstat: JStatStatic;
  export default jstat;
}
