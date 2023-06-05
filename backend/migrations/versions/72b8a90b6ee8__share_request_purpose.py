"""_share_request_purpose

Revision ID: 72b8a90b6ee8
Revises: 509997f0a51e
Create Date: 2023-06-05 12:28:56.221364

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '72b8a90b6ee8'
down_revision = '509997f0a51e'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('share_object', sa.Column('requestPurpose', sa.String(), nullable=True))
    op.add_column('share_object', sa.Column('rejectPurpose', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('share_object', 'reuestPurpose')
    op.drop_column('share_object', 'rejectPurpose')
    # ### end Alembic commands ###