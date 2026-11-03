import celery
import kombu
import redis
from celery import Celery
from celery.signals import worker_ready
from app.core.config import settings

# Log installed versions on import/startup
print(
    f"[Celery Startup Verification] "
    f"Celery: {celery.__version__}, "
    f"Kombu: {kombu.__version__}, "
    f"Redis: {redis.__version__}"
)

celery_app = Celery(
    "tunai_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    worker_concurrency=4,
)


@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    print(
        f"[Celery Worker Ready] Worker ready. "
        f"Celery: {celery.__version__}, "
        f"Kombu: {kombu.__version__}, "
        f"Redis: {redis.__version__}"
    )
    registered = list(celery_app.tasks.keys())
    print(f"[Celery Worker Ready] Registered tasks: {registered}")
