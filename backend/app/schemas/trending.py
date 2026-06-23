from pydantic import BaseModel


class TrendingBookOut(BaseModel):
    title: str
    author: str
    isbn: str | None = None
    cover_url: str | None = None
    description: str | None = None
    buy_link: str | None = None
    rank: int
    weeks_on_list: int
    book_id: int | None = None


class TrendingListOut(BaseModel):
    list_name: str
    display_name: str
    books: list[TrendingBookOut]


class TrendingResponse(BaseModel):
    enabled: bool
    lists: list[TrendingListOut] = []
