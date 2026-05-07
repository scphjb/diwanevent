"""
Outbox Relay Worker
يشغّل كـ worker منفصل، يعالج المهام من Redis queue.
في الوقت الحالي: placeholder يسجل إقلاعه ثم ينتظر.
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbox_relay")

async def main():
    logger.info("✅ Outbox Relay Worker started")
    logger.info("⏳ Waiting for tasks... (Redis integration pending)")
    # TODO: Connect to Redis and process outbox table
    while True:
        await asyncio.sleep(60)
        logger.debug("Worker heartbeat: still alive")

if __name__ == "__main__":
    asyncio.run(main())
