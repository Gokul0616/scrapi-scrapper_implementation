import docker
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class DockerExecutor:
    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            self.client = None

    async def run_actor(self, image: str, env: Dict[str, str], limits: Dict[str, Any], run_id: str, log_callback=None, command=None, volumes=None) -> int:
        """
        Runs the actor inside an isolated Docker container.
        Args:
            image: Docker image (e.g. 'apify/actor-node-playwright-chrome')
            env: Environment variables to pass.
            limits: Container resource limits.
            run_id: Unique ID for the run.
            log_callback: Async function to call with each line of stdout/stderr.
            command: Optional command to override the image's default command.
            volumes: Optional volume mounts.
        Returns:
            Exit code of the container.
        """
        if not self.client:
            logger.error("Docker client not initialized. Cannot run actor.")
            return -1

        try:
            # 1. Pull the image if not exists (in a background thread to not block)
            logger.info(f"Checking/pulling image {image}...")
            await asyncio.to_thread(self._pull_image, image)

            # 2. Start the container
            container = await asyncio.to_thread(
                self.client.containers.run,
                image=image,
                command=command,
                environment=env,
                volumes=volumes,
                mem_limit=limits.get("memory", "1g"),
                nano_cpus=limits.get("cpu_nano", int(1e9)),  # Default 1 CPU
                network_mode="bridge",
                detach=True,
                labels={"scrapi_run_id": run_id}
            )
            logger.info(f"Container {container.id} started for run {run_id}.")

            # 3. Stream logs asynchronously
            if log_callback:
                # Docker stream is blocking generator, we need to consume it in a thread
                # Or use a wrapper to stream it without blocking the event loop.
                # A simple way is to use a thread that pushes to an asyncio queue.
                log_queue = asyncio.Queue()
                loop = asyncio.get_running_loop()
                
                def _stream_logs_to_queue():
                    try:
                        for log_line in container.logs(stream=True, follow=True):
                            asyncio.run_coroutine_threadsafe(
                                log_queue.put(log_line.decode('utf-8', errors='replace')),
                                loop
                            )
                    except Exception as e:
                        logger.error(f"Log stream error: {e}")
                    finally:
                        asyncio.run_coroutine_threadsafe(log_queue.put(None), loop)

                # Start the background thread for logging
                log_thread = asyncio.to_thread(_stream_logs_to_queue)

                # Process logs asynchronously
                async def consume_logs():
                    while True:
                        line = await log_queue.get()
                        if line is None:
                            break
                        await log_callback(line.strip())
                
                consume_task = asyncio.create_task(consume_logs())

            # 4. Wait for the container to exit
            result = await asyncio.to_thread(container.wait)
            exit_code = result.get("StatusCode", -1)
            logger.info(f"Container {container.id} exited with code {exit_code}.")

            if log_callback:
                # Wait for logs to finish processing
                await consume_task
                await log_thread

            # 5. Cleanup
            await asyncio.to_thread(container.remove, force=True)
            return exit_code

        except Exception as e:
            logger.error(f"Error executing docker container for run {run_id}: {e}")
            return -1

    def _pull_image(self, image: str):
        try:
            self.client.images.get(image)
        except docker.errors.ImageNotFound:
            logger.info(f"Image {image} not found locally. Pulling...")
            self.client.images.pull(image)
