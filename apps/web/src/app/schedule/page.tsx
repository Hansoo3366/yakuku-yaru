import { redirect } from 'next/navigation';
import { getKoreaDateString } from '@/lib/date-format';

/** /schedule 은 한국 시간 기준 이번 달 일정표로 보낸다. */
export default function ScheduleIndexPage() {
  redirect(`/schedule/${getKoreaDateString().slice(0, 7)}`);
}
