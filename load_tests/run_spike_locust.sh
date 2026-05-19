#!/bin/sh
echo ''
echo '════════════════════════════════════════════════════════════'
echo '  LOCUST SPIKE — 200 Virtual Users | 1000 Concurrent Votes '
echo '  التوزيع: 60% مصوّت | 30% مسجّل | 10% قارئ كثيف           '
echo '════════════════════════════════════════════════════════════'
echo '[LOCUST] الانتظار لحين اكتمال زرع البيانات...'
while [ ! -f /mnt/locust/spike_config.json ]; do
  sleep 1
done
echo '[LOCUST] ✓ تم زرع البيانات بنجاح! بدء الهجوم الآن...'
mkdir -p /mnt/locust/reports
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
locust \
  -f spike_locustfile.py \
  --headless \
  -u 200 \
  -r 50 \
  --run-time 90s \
  --csv=/mnt/locust/reports/docker_spike_${TIMESTAMP} \
  --html=/mnt/locust/reports/docker_spike_${TIMESTAMP}.html \
  --host=http://spike_api:8000 \
  --exit-code-on-error 1
echo ''
echo '✅ تقرير Docker Spike محفوظ في: load_tests/reports/'
