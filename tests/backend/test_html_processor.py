import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

# Ensure repository root is on the import path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.backend.html_processor import HTMLProcessor


@pytest.fixture
def processor():
    return HTMLProcessor()


def test_process_arxiv_html_cleans_and_extracts_metadata(processor):
    sample_html = """
    <html>
      <body>
        <div class="ltx_page_main">
          <h1 class="ltx_title">Sample Paper Title</h1>
          <div class="ltx_authors">
            <span class="ltx_author">Author One</span>
            <span class="ltx_author">Author Two</span>
          </div>
          <div class="ltx_abstract">Abstract This is a sample abstract.</div>
          <script>console.log('noise');</script>
          <section>
            <h2>Introduction & Background</h2>
            <p>This is the introduction section with inline math $x^2$.</p>
            <img src="images/plot.png" />
            <table><tr><td>Data</td></tr></table>
          </section>
        </div>
      </body>
    </html>
    """

    result = processor.process_arxiv_html("1234.5678", sample_html)

    assert result["success"] is True
    assert result["metadata"]["title"] == "Sample Paper Title"
    assert result["metadata"]["authors"] == ["Author One", "Author Two"]
    assert result["metadata"]["abstract"] == "This is a sample abstract."
    assert result["arxiv_id"] == "1234.5678"

    content_soup = BeautifulSoup(result["content"], "html.parser")
    assert content_soup.find("script") is None

    img = content_soup.find("img")
    assert img["src"].startswith("https://arxiv.org/html/")

    table_classes = content_soup.find("table")["class"]
    assert "table" in table_classes and "table-responsive" in table_classes

    introduction_section = next(
        section for section in result["sections"] if section["title"] == "Introduction & Background"
    )
    assert introduction_section["id"] == "introduction-background"
    assert result["has_math"] is True


def test_create_paper_summary_returns_preview(processor):
    html = """
    <div class="ltx_page_main">
      <h1 class="ltx_title">Deep Learning Advances</h1>
      <div class="ltx_authors">
        <span class="ltx_author">A. Researcher</span>
      </div>
      <div class="ltx_abstract">Abstract This work explores advances.</div>
      <section>
        <h2>Overview</h2>
        <p>First sentence. Second sentence offers details! Third sentence keeps going? Fourth sentence adds more context.</p>
      </section>
    </div>
    """
    processed = processor.process_arxiv_html("0501.0001", html)

    summary = processor.create_paper_summary(processed)

    assert summary["arxiv_id"] == "0501.0001"
    assert summary["title"] == "Deep Learning Advances"
    assert summary["authors"] == ["A. Researcher"]
    assert any(section["title"] == "Overview" for section in summary["sections"])
    assert summary["has_math"] is False
    assert "First sentence" in summary["preview"]
    assert summary["preview"].strip().endswith("...")


def test_create_paper_summary_passthrough_on_failure(processor):
    error_payload = {"success": False, "error": "boom"}

    assert processor.create_paper_summary(error_payload) == error_payload
