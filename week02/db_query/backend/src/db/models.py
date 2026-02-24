from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class DatabaseConnection(Base):
    __tablename__ = "database_connections"

    name: Mapped[str] = mapped_column(String(255), primary_key=True)
    connection_url: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    tables: Mapped[list["TableMetadata"]] = relationship(
        back_populates="database", cascade="all, delete-orphan"
    )


class TableMetadata(Base):
    __tablename__ = "table_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    db_name: Mapped[str] = mapped_column(
        String(255), ForeignKey("database_connections.name", ondelete="CASCADE"), nullable=False
    )
    schema_name: Mapped[str] = mapped_column(String(255), nullable=False)
    table_name: Mapped[str] = mapped_column(String(255), nullable=False)
    table_type: Mapped[str] = mapped_column(String(50), nullable=False)

    database: Mapped["DatabaseConnection"] = relationship(back_populates="tables")
    columns: Mapped[list["ColumnMetadata"]] = relationship(
        back_populates="table", cascade="all, delete-orphan"
    )


class ColumnMetadata(Base):
    __tablename__ = "column_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    table_metadata_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("table_metadata.id", ondelete="CASCADE"), nullable=False
    )
    column_name: Mapped[str] = mapped_column(String(255), nullable=False)
    data_type: Mapped[str] = mapped_column(String(255), nullable=False)
    is_nullable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_primary_key: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    table: Mapped["TableMetadata"] = relationship(back_populates="columns")
