// src/lib/export-utils.ts
import { utils, writeFile } from 'xlsx';

export const exportToCSV = (data: any[], filename: string) => {
  try {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Data');
    writeFile(wb, `${filename}.csv`);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

export const exportToExcel = (data: any[], filename: string) => {
  try {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Data');
    writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};