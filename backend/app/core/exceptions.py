from fastapi import HTTPException, status

class NotFoundException(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class ForbiddenException(HTTPException):
    def __init__(self, detail: str = "Access forbidden: insufficient permissions or institutional boundary crossed"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class UnauthorizedException(HTTPException):
    def __init__(self, detail: str = "Could not validate authentication credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

class DuplicateException(HTTPException):
    def __init__(self, detail: str = "Duplicate record violates unique constraint"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)

class ValidationBusinessException(HTTPException):
    def __init__(self, detail: str = "Business validation rule violation"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
