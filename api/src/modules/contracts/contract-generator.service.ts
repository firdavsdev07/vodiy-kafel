import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { CompanyData } from './providers';

export interface ContractPdfInput {
  contractId: string;
  inn: string;
  company: CompanyData;
  customer: { companyName: string; contactName: string; phone: string };
  orderNumber?: string;
}

/**
 * Shartnoma shablonidan PDF yasaydi (B-045).
 *
 * ❓ TZ 7-bo'lim ochiq savoli: shablon bitta yoki mijoz turiga (jismoniy/
 *    yuridik shaxs) qarab bir nechtami — hozircha BITTA umumiy shablon.
 *    Javob kelganda faqat shu servis tahrirlanadi, chaqiruvchi emas.
 */
@Injectable()
export class ContractGeneratorService {
  generate(input: ContractPdfInput): Promise<Buffer> {
    return new Promise((resolvePromise, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolvePromise(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.render(doc, input);
      doc.end();
    });
  }

  private render(doc: PDFKit.PDFDocument, input: ContractPdfInput): void {
    const { company, customer, inn, orderNumber, contractId } = input;

    doc
      .fontSize(18)
      .text('Yetkazib berish shartnomasi', { align: 'center' })
      .moveDown();

    doc
      .fontSize(10)
      .text(`Shartnoma № ${contractId}`, { align: 'right' })
      .text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, {
        align: 'right',
      })
      .moveDown();

    doc.fontSize(12).text('Vodiy Kafel Savdo', { continued: false });
    doc.fontSize(10).text("Farg'ona shahri, O'zbekiston").moveDown();

    doc.fontSize(12).text('Mijoz:');
    doc
      .fontSize(10)
      .text(`Kompaniya: ${customer.companyName}`)
      .text(`Kontakt shaxs: ${customer.contactName}`)
      .text(`Telefon: ${customer.phone}`)
      .text(`INN: ${inn}`)
      .moveDown();

    doc.fontSize(12).text("Didox.uz orqali tekshirilgan ma'lumot (🧪 mock):");
    doc
      .fontSize(10)
      .text(`Rasmiy nomi: ${company.companyName}`)
      .text(`Rahbar: ${company.director}`)
      .text(`Manzil: ${company.address}`)
      .text(`Ro'yxatdan o'tgan: ${company.registeredAt}`)
      .moveDown();

    if (orderNumber) {
      doc.fontSize(10).text(`Tegishli buyurtma: ${orderNumber}`).moveDown();
    }

    doc
      .moveDown(2)
      .fontSize(10)
      .text(
        'Ushbu hujjat avtomatik generatsiya qilingan. Yuridik kuchga ' +
          'egaligi E-IMZO integratsiyasi ulangandan keyin aniqlanadi.',
        { align: 'left' },
      );
  }
}
