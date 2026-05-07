import logging
from logging.handlers import RotatingFileHandler
import os

def setup_logger():
    os.makedirs("logs", exist_ok=True)
    
    logger = logging.getLogger("diwan")
    logger.setLevel(logging.INFO)
    
    # Prevent duplicate handlers if setup_logger is called multiple times
    if logger.handlers:
        return logger
        
    # File handler (5MB, 5 backups)
    fh = RotatingFileHandler("logs/diwan.log", maxBytes=5*1024*1024, backupCount=5, encoding='utf-8')
    fh.setLevel(logging.INFO)
    
    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    
    # Format
    formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(name)s | %(message)s')
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    
    logger.addHandler(fh)
    logger.addHandler(ch)
    
    return logger

logger = setup_logger()
