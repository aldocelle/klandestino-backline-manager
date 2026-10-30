import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
for(const code of ['KB:TAM-SCM-001','KB:TAM-SCM-001-BD','KB:TAM-SCM-002-T12','KB:MAR-1960A-004','KB:AMP-810-002','KB:KEM-GTR-002','KB:HW-CL-004']) {
  const image=PNG.sync.read(await QRCode.toBuffer(code,{width:300,margin:2,errorCorrectionLevel:'M'}));
  const read=jsQR(new Uint8ClampedArray(image.data),image.width,image.height);
  if(read?.data!==code)throw new Error('QR failed: '+code);
  console.log('PASS readable QR: '+code);
}
