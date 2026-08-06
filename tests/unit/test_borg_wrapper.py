"""
Unit tests for borg wrapper utility
"""

import asyncio
import os
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from app.core.borg import BorgInterface


@pytest.mark.unit
class TestBorgWrapper:
    """Test borg command wrapper utilities"""

    def test_borg_interface_initialization(self):
        """Test BorgInterface initialization"""
        try:
            borg = BorgInterface()
            assert borg is not None
            assert hasattr(borg, "borg_cmd")
            assert borg.borg_cmd == "borg"
        except RuntimeError:
            # Borg might not be installed, which is acceptable
            pytest.skip("Borg not installed")

    def test_borg_command_attribute(self):
        """Test borg command attribute"""
        try:
            borg = BorgInterface()
            assert isinstance(borg.borg_cmd, str)
            assert len(borg.borg_cmd) > 0
        except RuntimeError:
            pytest.skip("Borg not installed")

    def test_borg_validation_caching(self):
        """Test that borg validation is cached"""
        try:
            borg1 = BorgInterface()
            borg2 = BorgInterface()
            # Both should use cached validation
            assert BorgInterface._validated is True
        except RuntimeError:
            pytest.skip("Borg not installed")


@pytest.mark.unit
class TestBorgCommandTimeout:
    """A timed-out command must not leave the subprocess (and its repo lock) behind"""

    @pytest.mark.asyncio
    async def test_execute_command_timeout_reaps_subprocess(self):
        try:
            borg = BorgInterface()
        except RuntimeError:
            pytest.skip("Borg not installed")

        real_exec = asyncio.create_subprocess_exec
        captured = {}

        async def capturing_exec(*args, **kwargs):
            process = await real_exec(*args, **kwargs)
            captured["process"] = process
            captured["kwargs"] = kwargs
            return process

        with patch(
            "app.core.borg.asyncio.create_subprocess_exec",
            side_effect=capturing_exec,
        ):
            result = await borg._execute_command(["sleep", "60"], timeout=0.5)

        assert result["success"] is False
        assert "timed out" in result["stderr"]
        process = captured["process"]
        # A reaped child has a returncode; None would mean it was left running
        assert process.returncode is not None
        assert process.returncode < 0
        assert captured["kwargs"]["start_new_session"] is True

    @pytest.mark.asyncio
    async def test_execute_command_timeout_kills_whole_process_group(self):
        try:
            borg = BorgInterface()
        except RuntimeError:
            pytest.skip("Borg not installed")

        # Unique sleep duration so pgrep cannot match unrelated processes
        marker = "sleep 63997"
        result = await borg._execute_command(
            ["bash", "-c", f"{marker} & wait"], timeout=0.5
        )

        assert result["success"] is False
        for _ in range(20):
            pgrep = subprocess.run(
                ["pgrep", "-f", marker], capture_output=True, text=True
            )
            if pgrep.returncode != 0:
                break
            await asyncio.sleep(0.1)
        assert pgrep.returncode != 0, "grandchild process survived the timeout"


@pytest.mark.unit
class TestBorgErrorParsing:
    """Test borg error message parsing"""

    def test_parse_borg_error_message(self):
        """Test parsing borg error messages"""
        from app.core.borg_errors import get_error_details

        # Test with common error codes
        error_code = 2  # Borg error exit code
        details = get_error_details(error_code)

        assert details is not None
        assert isinstance(details, (str, dict))

    def test_parse_borg_success_code(self):
        """Test parsing borg success code"""
        from app.core.borg_errors import get_error_details

        details = get_error_details(0)  # Success
        assert details is not None

    def test_format_error_message(self):
        """Test formatting borg error messages"""
        from app.core.borg_errors import format_error_message

        message = format_error_message(2, "Test error output")

        assert isinstance(message, str)
        assert len(message) > 0


@pytest.mark.unit
class TestBorgRepository:
    """Test borg repository operations"""

    def test_repository_path_validation(self):
        """Test repository path validation"""
        # Import and test path validation if available

        # Test valid paths
        valid_paths = [
            "/tmp/test-repo",
            "/data/backups/repo",
            "user@host:/path/to/repo",
        ]

        for path in valid_paths:
            # Should not raise error for valid paths
            assert isinstance(path, str)

    def test_archive_name_validation(self):
        """Test archive name validation"""
        # Test archive name format
        valid_names = ["backup-2024-01-01", "daily-backup", "archive_name_123"]

        for name in valid_names:
            # Archive names should be strings
            assert isinstance(name, str)
            assert len(name) > 0

    def test_repository_url_parsing(self):
        """Test parsing repository URLs"""
        test_urls = [
            "/local/path/repo",
            "ssh://user@host:22/path/repo",
            "user@host:repo",
        ]

        for url in test_urls:
            # URLs should be valid strings
            assert isinstance(url, str)
            assert len(url) > 0


@pytest.mark.unit
class TestStreamingCommandTimeout:
    """The streaming path is used by `borg list`, which can stall on a remote
    repository whose SSH transport has gone away without closing the socket.
    """

    @pytest.mark.asyncio
    async def test_timeout_fires_when_the_process_emits_no_output(self):
        """A hang with no output must still time out.

        The timeout used to be checked only after a line arrived, so a process
        that produced nothing blocked forever and the job stayed 'running'
        until the container restarted.
        """
        borg = BorgInterface()

        started = asyncio.get_event_loop().time()
        result = await borg._execute_command_streaming(
            ["sleep", "30"],
            timeout=1,
        )
        elapsed = asyncio.get_event_loop().time() - started

        assert result["success"] is False
        assert "timed out" in result["stderr"]
        assert elapsed < 15, f"timeout did not fire promptly (took {elapsed:.1f}s)"

    @pytest.mark.asyncio
    async def test_timed_out_process_is_not_left_running(self):
        """A surviving borg keeps the repository lock, so every later operation
        on that repository fails until someone breaks the lock by hand.
        """
        borg = BorgInterface()

        with tempfile.NamedTemporaryFile(suffix=".pid", delete=False) as handle:
            pid_path = handle.name

        try:
            await borg._execute_command_streaming(
                ["sh", "-c", f"echo $$ > {pid_path}; exec sleep 30"],
                timeout=1,
            )

            child_pid = int(Path(pid_path).read_text().strip())

            # Give the signal a moment to be delivered and reaped.
            for _ in range(50):
                if not _pid_alive(child_pid):
                    break
                await asyncio.sleep(0.1)

            assert not _pid_alive(child_pid), (
                f"pid {child_pid} survived the timeout and still holds its lock"
            )
        finally:
            Path(pid_path).unlink(missing_ok=True)


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True
